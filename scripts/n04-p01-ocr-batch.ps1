param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
$ocrBatch=@()
foreach($ocrName in @('after-1x-overview','after-1x-overview-standard-resume','after-1x-overview-performance','after-1x-crew','after-30x-overview','after-30x-crew')){
  $ocrDirectory=Join-Path $Root $ocrName
  $ocrManifest=Join-Path $ocrDirectory 'ocr-manifest.json'
  $ocrOutput=Join-Path $ocrDirectory 'ocr.json'
  if(-not (Test-Path -LiteralPath $ocrOutput)){
    Write-Host ('Offline OCR '+$ocrName)
    & (Join-Path $PSScriptRoot 'n04-p01-ocr.ps1') -Manifest $ocrManifest -Output $ocrOutput
  }
  $ocrReport=Get-Content -LiteralPath $ocrOutput -Raw | ConvertFrom-Json
  $ocrChecks=@($ocrReport.results | ForEach-Object { $_.checks })
  $ocrBatch+=@{directory=$ocrName;images=$ocrReport.results.Count;numbers=$ocrChecks.Count;ocr_matched=@($ocrChecks | Where-Object { $_.matched }).Count}
}
@{scope='Offline OCR only;exact glyph/source/latency assessment remains separate';reports=$ocrBatch} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Root 'ocr-batch.json') -Encoding UTF8
