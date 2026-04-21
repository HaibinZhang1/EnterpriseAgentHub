param(
  [string]$SourceDir = "C:\Users\ZhangHB\xwechat_files\wxid_nnto4cx9lqnu22_ba7a\msg\file\2026-04",
  [switch]$Overwrite
)

$ErrorActionPreference = "Stop"

function Release-ComObject {
  param([object]$ComObject)

  if ($null -ne $ComObject) {
    [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($ComObject)
  }
}

$expectedPattern = "^kylin-v10-x86_64-offline-bundle\.zip\.(00[1-9]|01[0-3])$"
$wdFormatXmlDocument = 12

if (-not (Test-Path -LiteralPath $SourceDir -PathType Container)) {
  throw "Source directory does not exist: $SourceDir"
}

$sourceFiles = Get-ChildItem -LiteralPath $SourceDir -File |
  Where-Object { $_.Name -match $expectedPattern } |
  Sort-Object Name

if ($sourceFiles.Count -ne 13) {
  throw "Expected 13 source parts but found $($sourceFiles.Count)."
}

$createdFiles = New-Object System.Collections.Generic.List[string]
$skippedFiles = New-Object System.Collections.Generic.List[string]
$word = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  foreach ($sourceFile in $sourceFiles) {
    $targetDocx = Join-Path $SourceDir ($sourceFile.Name + ".docx")

    if ((Test-Path -LiteralPath $targetDocx) -and -not $Overwrite) {
      Write-Host "[SKIP] Already exists: $targetDocx"
      $skippedFiles.Add($targetDocx)
      continue
    }

    if ((Test-Path -LiteralPath $targetDocx) -and $Overwrite) {
      Remove-Item -LiteralPath $targetDocx -Force
    }

    $doc = $null
    $range = $null

    try {
      $doc = $word.Documents.Add()
      $range = $doc.Range(0, 0)
      $range.Text = "Embedded file: $($sourceFile.Name)`r`nDouble-click the icon to open this part.`r`n`r`n"
      $range.Collapse(0)

      $null = $range.InlineShapes.AddOLEObject(
        "Package",
        $sourceFile.FullName,
        $false,
        $true,
        $null,
        0,
        $sourceFile.Name
      )

      $doc.SaveAs([ref]$targetDocx, [ref]$wdFormatXmlDocument)
      $createdFiles.Add($targetDocx)
      Write-Host "[OK] Created: $targetDocx"
    }
    finally {
      if ($null -ne $doc) {
        $doc.Close([ref]$false)
      }

      Release-ComObject -ComObject $range
      Release-ComObject -ComObject $doc
    }
  }
}
finally {
  if ($null -ne $word) {
    $word.Quit()
  }

  Release-ComObject -ComObject $word
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Host ""
Write-Host "Completed."
Write-Host "Created documents: $($createdFiles.Count)"
Write-Host "Skipped documents: $($skippedFiles.Count)"
