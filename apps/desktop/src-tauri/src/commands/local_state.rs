use std::fs;
use std::io::{self, Cursor};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use reqwest::blocking::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use zip::ZipArchive;

#[cfg(not(test))]
use crate::adapters::{
    builtin_adapters, detect_adapter, expand_windows_user_profile, AdapterConfig, AdapterID,
    InstallMode as AdapterInstallMode,
};
#[cfg(test)]
use crate::commands::distribution::adapters::{
    builtin_adapters, detect_adapter, expand_windows_user_profile, AdapterConfig, AdapterID,
    InstallMode as AdapterInstallMode,
};
use crate::commands::distribution::{enable_distribution, EnableDistributionRequest};
use crate::store::central_store::{default_central_store_root, ensure_central_store_root};
use crate::store::commands::{
    install_skill_package as store_install_skill_package,
    update_skill_package as store_update_skill_package, InstallSkillPackageRequest,
    UpdateSkillPackageRequest,
};
use crate::store::models::LocalSkillInstall;
use crate::store::sqlite::{ordered_migrations, statements};

#[derive(Debug, Clone)]
pub struct P1LocalState {
    central_store_root: PathBuf,
    db_path: PathBuf,
    http: Client,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DownloadTicketPayload {
    #[serde(rename = "skillID")]
    pub skill_id: String,
    pub version: String,
    #[serde(rename = "packageURL")]
    pub package_url: String,
    #[serde(rename = "packageHash")]
    pub package_hash: String,
    #[serde(rename = "packageSize")]
    pub package_size: u64,
    #[serde(rename = "packageFileCount")]
    pub package_file_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBootstrapPayload {
    pub installs: Vec<LocalSkillInstallPayload>,
    pub tools: Vec<ToolConfigPayload>,
    pub projects: Vec<ProjectConfigPayload>,
    pub pending_offline_event_count: u32,
    pub unread_local_notification_count: u32,
    pub central_store_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolConfigPayload {
    #[serde(rename = "toolID")]
    pub tool_id: String,
    pub name: String,
    pub display_name: String,
    pub config_path: String,
    pub skills_path: String,
    pub enabled: bool,
    pub status: String,
    pub adapter_status: String,
    pub transform: String,
    pub transform_strategy: String,
    pub enabled_skill_count: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectConfigPayload {
    #[serde(rename = "projectID")]
    pub project_id: String,
    pub name: String,
    pub display_name: String,
    pub project_path: String,
    pub skills_path: String,
    pub enabled: bool,
    pub enabled_skill_count: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSkillInstallPayload {
    #[serde(rename = "skillID")]
    pub skill_id: String,
    pub display_name: String,
    pub local_version: String,
    pub local_hash: String,
    pub source_package_hash: String,
    pub installed_at: String,
    pub updated_at: String,
    pub local_status: String,
    pub central_store_path: String,
    pub enabled_targets: Vec<EnabledTargetPayload>,
    pub has_update: bool,
    pub is_scope_restricted: bool,
    pub can_update: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnabledTargetPayload {
    pub id: String,
    #[serde(rename = "skillID")]
    pub skill_id: String,
    pub target_type: String,
    #[serde(rename = "targetID")]
    pub target_id: String,
    pub target_name: String,
    pub target_path: String,
    pub artifact_path: String,
    pub install_mode: String,
    pub requested_mode: String,
    pub resolved_mode: String,
    pub fallback_reason: Option<String>,
    pub artifact_hash: String,
    pub enabled_at: String,
    pub updated_at: String,
    pub status: String,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalEventPayload {
    #[serde(rename = "eventID")]
    event_id: String,
    event_type: String,
    #[serde(rename = "skillID")]
    skill_id: String,
    version: String,
    target_type: String,
    #[serde(rename = "targetID")]
    target_id: String,
    target_path: String,
    requested_mode: String,
    resolved_mode: String,
    fallback_reason: Option<String>,
    occurred_at: String,
    result: String,
}

impl P1LocalState {
    pub fn initialize(app_data_dir: impl AsRef<Path>) -> Result<Self, String> {
        let app_data_dir = app_data_dir.as_ref().to_path_buf();
        fs::create_dir_all(&app_data_dir).map_err(|error| {
            format!("create app data dir {}: {error}", app_data_dir.display())
        })?;
        let central_store_root = ensure_central_store_root(default_central_store_root(&app_data_dir))
            .map_err(|error| error.to_string())?;
        let db_dir = app_data_dir.join("EnterpriseAgentHub");
        fs::create_dir_all(&db_dir)
            .map_err(|error| format!("create local db dir {}: {error}", db_dir.display()))?;
        let db_path = db_dir.join("skills.db");
        let state = Self {
            central_store_root,
            db_path,
            http: Client::new(),
        };
        let conn = state.open_connection().map_err(|error| error.to_string())?;
        state
            .set_store_metadata(&conn)
            .map_err(|error| error.to_string())?;
        Ok(state)
    }

    pub fn central_store_root(&self) -> &Path {
        &self.central_store_root
    }

    pub fn get_local_bootstrap(&self) -> Result<LocalBootstrapPayload, String> {
        let conn = self.open_connection().map_err(|error| error.to_string())?;
        Ok(LocalBootstrapPayload {
            installs: self
                .list_local_installs_from_conn(&conn)
                .map_err(|error| error.to_string())?,
            tools: self.detect_tools_from_conn(&conn).map_err(|error| error.to_string())?,
            projects: Vec::new(),
            pending_offline_event_count: count_pending_offline_events(&conn)
                .map_err(|error| error.to_string())?,
            unread_local_notification_count: count_unread_local_notifications(&conn)
                .map_err(|error| error.to_string())?,
            central_store_path: self.central_store_root.to_string_lossy().to_string(),
        })
    }

    pub fn detect_tools(&self) -> Result<Vec<ToolConfigPayload>, String> {
        let conn = self.open_connection().map_err(|error| error.to_string())?;
        self.detect_tools_from_conn(&conn)
            .map_err(|error| error.to_string())
    }

    pub fn install_skill_package(
        &self,
        download_ticket: DownloadTicketPayload,
    ) -> Result<LocalSkillInstallPayload, String> {
        let package_dir = self.download_and_extract_package(&download_ticket)?;
        let timestamp = now_iso();
        let install = store_install_skill_package(InstallSkillPackageRequest {
            skill_id: download_ticket.skill_id.clone(),
            display_name: download_ticket.skill_id.clone(),
            version: download_ticket.version.clone(),
            downloaded_package_dir: package_dir.clone(),
            central_store_root: self.central_store_root.clone(),
            expected_package_hash: Some(download_ticket.package_hash.clone()),
            installed_at: timestamp.clone(),
        })
        .map_err(|error| error.to_string())?;
        let _ = fs::remove_dir_all(&package_dir);

        let conn = self.open_connection().map_err(|error| error.to_string())?;
        upsert_local_install(&conn, &install).map_err(|error| error.to_string())?;
        self.local_install_payload(&conn, install)
            .map_err(|error| error.to_string())
    }

    pub fn update_skill_package(
        &self,
        download_ticket: DownloadTicketPayload,
    ) -> Result<LocalSkillInstallPayload, String> {
        let package_dir = self.download_and_extract_package(&download_ticket)?;
        let timestamp = now_iso();
        let install = store_update_skill_package(UpdateSkillPackageRequest {
            skill_id: download_ticket.skill_id.clone(),
            display_name: download_ticket.skill_id.clone(),
            version: download_ticket.version.clone(),
            downloaded_package_dir: package_dir.clone(),
            central_store_root: self.central_store_root.clone(),
            expected_package_hash: Some(download_ticket.package_hash.clone()),
            updated_at: timestamp.clone(),
        })
        .map_err(|error| error.to_string())?;
        let _ = fs::remove_dir_all(&package_dir);

        let conn = self.open_connection().map_err(|error| error.to_string())?;
        upsert_local_install(&conn, &install).map_err(|error| error.to_string())?;
        self.local_install_payload(&conn, install)
            .map_err(|error| error.to_string())
    }

    pub fn list_local_installs(&self) -> Result<Vec<LocalSkillInstallPayload>, String> {
        let conn = self.open_connection().map_err(|error| error.to_string())?;
        self.list_local_installs_from_conn(&conn)
            .map_err(|error| error.to_string())
    }

    pub fn enable_skill(
        &self,
        skill_id: String,
        version: String,
        target_type: String,
        target_id: String,
        preferred_mode: Option<String>,
    ) -> Result<EnabledTargetPayload, String> {
        if target_type != "tool" || target_id != "codex" {
            return Err("P1 vertical slice only supports enabling tool:codex".to_string());
        }

        let conn = self.open_connection().map_err(|error| error.to_string())?;
        let install = load_install_row(&conn, &skill_id).map_err(|error| error.to_string())?;
        let installed_version = if version.trim().is_empty() {
            install.local_version.clone()
        } else {
            version
        };
        if installed_version != install.local_version {
            return Err(format!(
                "installed version is {}, requested {}",
                install.local_version, installed_version
            ));
        }

        let adapter = builtin_adapters()
            .into_iter()
            .find(|adapter| adapter.tool_id == AdapterID::Codex)
            .ok_or_else(|| "Codex adapter is not registered".to_string())?;
        let target_root = codex_target_root(&adapter)?;
        let requested_mode = parse_adapter_mode(preferred_mode.as_deref().unwrap_or("symlink"))?;
        let artifact_path = self
            .central_store_root
            .join("derived")
            .join(&skill_id)
            .join(&installed_version)
            .join(adapter.transform_strategy.as_str());
        let response = enable_distribution(EnableDistributionRequest {
            skill_id: skill_id.clone(),
            version: installed_version.clone(),
            adapter_id: AdapterID::Codex,
            central_store_skill_path: PathBuf::from(&install.central_store_path),
            derived_root: self.central_store_root.join("derived"),
            target_root,
            requested_mode,
        })
        .map_err(|error| error.to_string())?;

        let timestamp = now_iso();
        let target = EnabledTargetPayload {
            id: format!("{skill_id}:tool:codex"),
            skill_id: skill_id.clone(),
            target_type: "tool".to_string(),
            target_id: "codex".to_string(),
            target_name: "Codex".to_string(),
            target_path: response.target_path.to_string_lossy().to_string(),
            artifact_path: artifact_path.to_string_lossy().to_string(),
            install_mode: response.resolved_mode.as_str().to_string(),
            requested_mode: response.requested_mode.as_str().to_string(),
            resolved_mode: response.resolved_mode.as_str().to_string(),
            fallback_reason: response.fallback_reason.clone(),
            artifact_hash: install.local_hash.clone(),
            enabled_at: timestamp.clone(),
            updated_at: timestamp.clone(),
            status: "enabled".to_string(),
            last_error: None,
        };
        upsert_enabled_target(&conn, &target).map_err(|error| error.to_string())?;
        conn.execute(
            "UPDATE local_skill_installs SET local_status = 'enabled', updated_at = ? WHERE skill_id = ?",
            params![timestamp, skill_id],
        )
        .map_err(|error| error.to_string())?;
        insert_offline_event(&conn, &target, &install.local_version)
            .map_err(|error| error.to_string())?;

        Ok(target)
    }

    fn open_connection(&self) -> rusqlite::Result<Connection> {
        let conn = Connection::open(&self.db_path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        for (_, sql) in ordered_migrations() {
            conn.execute_batch(sql)?;
        }
        Ok(conn)
    }

    fn set_store_metadata(&self, conn: &Connection) -> rusqlite::Result<()> {
        conn.execute(
            statements::SET_STORE_METADATA,
            params![
                "central_store_path",
                self.central_store_root.to_string_lossy().to_string(),
                now_iso()
            ],
        )?;
        Ok(())
    }

    fn download_and_extract_package(
        &self,
        ticket: &DownloadTicketPayload,
    ) -> Result<PathBuf, String> {
        let downloads_root = self.central_store_root.join("downloads");
        fs::create_dir_all(&downloads_root)
            .map_err(|error| format!("create downloads root: {error}"))?;
        let response = self
            .http
            .get(&ticket.package_url)
            .send()
            .map_err(|error| format!("download package: {error}"))?
            .error_for_status()
            .map_err(|error| format!("download package status: {error}"))?;
        let bytes = response
            .bytes()
            .map_err(|error| format!("read package bytes: {error}"))?;
        if bytes.len() as u64 != ticket.package_size {
            return Err(format!(
                "downloaded package size mismatch: expected {}, actual {}",
                ticket.package_size,
                bytes.len()
            ));
        }

        let extract_dir = downloads_root.join(format!(
            ".{}-{}-{}.tmp",
            sanitize_segment(&ticket.skill_id),
            sanitize_segment(&ticket.version),
            now_millis()
        ));
        if extract_dir.exists() {
            fs::remove_dir_all(&extract_dir)
                .map_err(|error| format!("clear temp package dir: {error}"))?;
        }
        fs::create_dir_all(&extract_dir)
            .map_err(|error| format!("create temp package dir: {error}"))?;
        extract_zip_bytes(&bytes, &extract_dir)?;
        Ok(extract_dir)
    }

    fn detect_tools_from_conn(&self, conn: &Connection) -> rusqlite::Result<Vec<ToolConfigPayload>> {
        let mut tools = Vec::new();
        for adapter in builtin_adapters() {
            let skills_path = adapter
                .target
                .global_paths
                .first()
                .map(|path| expand_windows_user_profile(path).to_string_lossy().to_string())
                .unwrap_or_default();
            let detection = detect_adapter(&adapter, None);
            let enabled_skill_count = count_enabled_targets_for_tool(conn, adapter.tool_id.as_str())?;
            tools.push(ToolConfigPayload {
                tool_id: adapter.tool_id.as_str().to_string(),
                name: adapter.display_name.clone(),
                display_name: adapter.display_name,
                config_path: skills_path.clone(),
                skills_path,
                enabled: adapter.enabled,
                status: detection.status.as_str().to_string(),
                adapter_status: detection.status.as_str().to_string(),
                transform: adapter.transform_strategy.as_str().to_string(),
                transform_strategy: adapter.transform_strategy.as_str().to_string(),
                enabled_skill_count,
            });
        }
        Ok(tools)
    }

    fn list_local_installs_from_conn(
        &self,
        conn: &Connection,
    ) -> rusqlite::Result<Vec<LocalSkillInstallPayload>> {
        let mut statement = conn.prepare(
            "
            SELECT skill_id, display_name, local_version, local_hash, source_package_hash,
                   installed_at, updated_at, local_status, central_store_path,
                   has_update, is_scope_restricted, can_update
            FROM local_skill_installs
            ORDER BY updated_at DESC
            ",
        )?;
        let rows = statement.query_map([], |row| {
            Ok(LocalSkillInstallPayload {
                skill_id: row.get(0)?,
                display_name: row.get(1)?,
                local_version: row.get(2)?,
                local_hash: row.get(3)?,
                source_package_hash: row.get(4)?,
                installed_at: row.get(5)?,
                updated_at: row.get(6)?,
                local_status: row.get(7)?,
                central_store_path: row.get(8)?,
                enabled_targets: Vec::new(),
                has_update: int_to_bool(row.get(9)?),
                is_scope_restricted: int_to_bool(row.get(10)?),
                can_update: int_to_bool(row.get(11)?),
            })
        })?;

        let mut installs = Vec::new();
        for row in rows {
            let mut install = row?;
            install.enabled_targets = load_enabled_targets(conn, &install.skill_id)?;
            installs.push(install);
        }
        Ok(installs)
    }

    fn local_install_payload(
        &self,
        conn: &Connection,
        install: LocalSkillInstall,
    ) -> rusqlite::Result<LocalSkillInstallPayload> {
        Ok(LocalSkillInstallPayload {
            enabled_targets: load_enabled_targets(conn, &install.skill_id)?,
            skill_id: install.skill_id,
            display_name: install.display_name,
            local_version: install.local_version,
            local_hash: install.local_hash,
            source_package_hash: install.source_package_hash,
            installed_at: install.installed_at,
            updated_at: install.updated_at,
            local_status: install.local_status.as_str().to_string(),
            central_store_path: install.central_store_path.to_string_lossy().to_string(),
            has_update: install.has_update,
            is_scope_restricted: install.is_scope_restricted,
            can_update: install.can_update,
        })
    }
}

fn extract_zip_bytes(bytes: &[u8], target_dir: &Path) -> Result<(), String> {
    let mut archive =
        ZipArchive::new(Cursor::new(bytes)).map_err(|error| format!("read package zip: {error}"))?;
    for index in 0..archive.len() {
        let mut file = archive
            .by_index(index)
            .map_err(|error| format!("read package zip entry: {error}"))?;
        let enclosed = file
            .enclosed_name()
            .ok_or_else(|| format!("unsafe package entry path: {}", file.name()))?
            .to_path_buf();
        let output_path = target_dir.join(enclosed);
        if file.is_dir() {
            fs::create_dir_all(&output_path)
                .map_err(|error| format!("create package directory: {error}"))?;
            continue;
        }
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("create package file parent: {error}"))?;
        }
        let mut output = fs::File::create(&output_path)
            .map_err(|error| format!("create package file {}: {error}", output_path.display()))?;
        io::copy(&mut file, &mut output)
            .map_err(|error| format!("extract package file {}: {error}", output_path.display()))?;
    }
    Ok(())
}

fn upsert_local_install(conn: &Connection, install: &LocalSkillInstall) -> rusqlite::Result<()> {
    conn.execute(
        statements::UPSERT_LOCAL_SKILL_INSTALL,
        params![
            &install.skill_id,
            &install.display_name,
            &install.local_version,
            &install.local_hash,
            &install.source_package_hash,
            install.central_store_path.to_string_lossy().to_string(),
            install.local_status.as_str(),
            bool_to_int(install.has_update),
            bool_to_int(install.is_scope_restricted),
            bool_to_int(install.can_update),
            &install.installed_at,
            &install.updated_at,
        ],
    )?;
    Ok(())
}

fn upsert_enabled_target(conn: &Connection, target: &EnabledTargetPayload) -> rusqlite::Result<()> {
    conn.execute(
        statements::UPSERT_ENABLED_TARGET,
        params![
            &target.id,
            &target.skill_id,
            &target.target_type,
            &target.target_id,
            &target.target_name,
            &target.target_path,
            &target.artifact_path,
            &target.install_mode,
            &target.requested_mode,
            &target.resolved_mode,
            &target.fallback_reason,
            &target.artifact_hash,
            &target.status,
            &target.last_error,
            &target.enabled_at,
            &target.updated_at,
        ],
    )?;
    Ok(())
}

fn insert_offline_event(
    conn: &Connection,
    target: &EnabledTargetPayload,
    version: &str,
) -> rusqlite::Result<()> {
    let event = LocalEventPayload {
        event_id: format!("evt_{}", now_millis()),
        event_type: "enable_result".to_string(),
        skill_id: target.skill_id.clone(),
        version: version.to_string(),
        target_type: target.target_type.clone(),
        target_id: target.target_id.clone(),
        target_path: target.target_path.clone(),
        requested_mode: target.requested_mode.clone(),
        resolved_mode: target.resolved_mode.clone(),
        fallback_reason: target.fallback_reason.clone(),
        occurred_at: target.enabled_at.clone(),
        result: "success".to_string(),
    };
    let payload = serde_json::to_string(&event)
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
    conn.execute(
        statements::INSERT_OFFLINE_EVENT,
        params![event.event_id, event.event_type, payload, event.occurred_at],
    )?;
    Ok(())
}

fn load_install_row(conn: &Connection, skill_id: &str) -> rusqlite::Result<LocalSkillInstallPayload> {
    conn.query_row(
        "
        SELECT skill_id, display_name, local_version, local_hash, source_package_hash,
               installed_at, updated_at, local_status, central_store_path,
               has_update, is_scope_restricted, can_update
        FROM local_skill_installs
        WHERE skill_id = ?
        ",
        [skill_id],
        |row| {
            Ok(LocalSkillInstallPayload {
                skill_id: row.get(0)?,
                display_name: row.get(1)?,
                local_version: row.get(2)?,
                local_hash: row.get(3)?,
                source_package_hash: row.get(4)?,
                installed_at: row.get(5)?,
                updated_at: row.get(6)?,
                local_status: row.get(7)?,
                central_store_path: row.get(8)?,
                enabled_targets: Vec::new(),
                has_update: int_to_bool(row.get(9)?),
                is_scope_restricted: int_to_bool(row.get(10)?),
                can_update: int_to_bool(row.get(11)?),
            })
        },
    )
}

fn load_enabled_targets(
    conn: &Connection,
    skill_id: &str,
) -> rusqlite::Result<Vec<EnabledTargetPayload>> {
    let mut statement = conn.prepare(
        "
        SELECT id, skill_id, target_type, target_id, target_name, target_path, artifact_path,
               install_mode, requested_mode, resolved_mode, fallback_reason, artifact_hash,
               enabled_at, updated_at, status, last_error
        FROM enabled_targets
        WHERE skill_id = ? AND status = 'enabled'
        ORDER BY updated_at DESC
        ",
    )?;
    let rows = statement.query_map([skill_id], |row| {
        Ok(EnabledTargetPayload {
            id: row.get(0)?,
            skill_id: row.get(1)?,
            target_type: row.get(2)?,
            target_id: row.get(3)?,
            target_name: row.get(4)?,
            target_path: row.get(5)?,
            artifact_path: row.get(6)?,
            install_mode: row.get(7)?,
            requested_mode: row.get(8)?,
            resolved_mode: row.get(9)?,
            fallback_reason: row.get(10)?,
            artifact_hash: row.get(11)?,
            enabled_at: row.get(12)?,
            updated_at: row.get(13)?,
            status: row.get(14)?,
            last_error: row.get(15)?,
        })
    })?;
    rows.collect()
}

fn count_enabled_targets_for_tool(conn: &Connection, tool_id: &str) -> rusqlite::Result<u32> {
    let count = conn.query_row(
        "SELECT count(*) FROM enabled_targets WHERE target_type = 'tool' AND target_id = ? AND status = 'enabled'",
        [tool_id],
        |row| row.get::<_, i64>(0),
    )?;
    Ok(count as u32)
}

fn count_pending_offline_events(conn: &Connection) -> rusqlite::Result<u32> {
    let count = conn.query_row(
        "SELECT count(*) FROM offline_event_queue WHERE status = 'pending'",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    Ok(count as u32)
}

fn count_unread_local_notifications(conn: &Connection) -> rusqlite::Result<u32> {
    let count = conn.query_row(
        "SELECT count(*) FROM local_notifications WHERE read_at IS NULL",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    Ok(count as u32)
}

fn parse_adapter_mode(value: &str) -> Result<AdapterInstallMode, String> {
    match value {
        "symlink" => Ok(AdapterInstallMode::Symlink),
        "copy" => Ok(AdapterInstallMode::Copy),
        other => Err(format!("unsupported install mode: {other}")),
    }
}

fn codex_target_root(adapter: &AdapterConfig) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("EAH_P1_CODEX_SKILLS_PATH") {
        if !path.trim().is_empty() {
            return Ok(PathBuf::from(path));
        }
    }
    adapter
        .target
        .global_paths
        .first()
        .map(|path| expand_windows_user_profile(path))
        .ok_or_else(|| "Codex adapter has no global target path".to_string())
}

fn bool_to_int(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

fn int_to_bool(value: i64) -> bool {
    value != 0
}

fn sanitize_segment(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

fn now_iso() -> String {
    let millis = now_millis();
    format!("p1-local-{millis}")
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;

    #[test]
    fn installs_enables_and_restores_from_sqlite() {
        let temp = TestTemp::new("local-state");
        let package_bytes = fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR")).join(
                "../../api/src/database/seeds/packages/codex-review-helper/1.2.0/package.zip",
            ),
        )
        .expect("read seed package zip");
        let package_url = serve_once(package_bytes.clone());
        let state = P1LocalState::initialize(temp.path.join("app-data")).expect("init state");
        std::env::set_var(
            "EAH_P1_CODEX_SKILLS_PATH",
            temp.path.join("codex-skills").to_string_lossy().to_string(),
        );

        let installed = state
            .install_skill_package(DownloadTicketPayload {
                skill_id: "codex-review-helper".to_string(),
                version: "1.2.0".to_string(),
                package_url,
                package_hash:
                    "sha256:9650d3afdfb7b401ff9c52015f277ec075e768a64aefcc8872257dd51b4cdef5"
                        .to_string(),
                package_size: package_bytes.len() as u64,
                package_file_count: 2,
            })
            .expect("install skill");
        assert_eq!(installed.local_version, "1.2.0");
        assert!(Path::new(&installed.central_store_path).join("SKILL.md").is_file());

        let target = state
            .enable_skill(
                "codex-review-helper".to_string(),
                "1.2.0".to_string(),
                "tool".to_string(),
                "codex".to_string(),
                Some("copy".to_string()),
            )
            .expect("enable skill");
        assert_eq!(target.target_id, "codex");
        assert_eq!(target.resolved_mode, "copy");
        assert!(Path::new(&target.target_path).join("SKILL.md").is_file());

        let restored_state =
            P1LocalState::initialize(temp.path.join("app-data")).expect("reopen state");
        let restored = restored_state
            .list_local_installs()
            .expect("list local installs");
        assert_eq!(restored.len(), 1);
        assert_eq!(restored[0].skill_id, "codex-review-helper");
        assert_eq!(restored[0].enabled_targets.len(), 1);
        assert_eq!(restored[0].enabled_targets[0].target_id, "codex");

        std::env::remove_var("EAH_P1_CODEX_SKILLS_PATH");
    }

    fn serve_once(body: Vec<u8>) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind package server");
        let addr = listener.local_addr().expect("package server addr");
        thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept package request");
            let mut request = [0_u8; 1024];
            let _ = stream.read(&mut request);
            write!(
                stream,
                "HTTP/1.1 200 OK\r\ncontent-type: application/zip\r\ncontent-length: {}\r\n\r\n",
                body.len()
            )
            .expect("write response headers");
            stream.write_all(&body).expect("write response body");
        });
        format!("http://{addr}/package.zip")
    }

    struct TestTemp {
        path: PathBuf,
    }

    impl TestTemp {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!("eah-{name}-{}", now_millis()));
            fs::create_dir_all(&path).unwrap();
            Self { path }
        }
    }

    impl Drop for TestTemp {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }
}
