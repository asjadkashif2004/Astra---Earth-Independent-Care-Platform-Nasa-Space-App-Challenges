param([Parameter(Mandatory=$true)][string]$Manifest,[Parameter(Mandatory=$true)][string]$Output,[int]$CropPadding=16,[int]$CropScale=2)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapTransform,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$ocrAwaitMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Wait-OcrOperation($Operation,[Type]$ResultType) {
  $ocrTask = $ocrAwaitMethod.MakeGenericMethod($ResultType).Invoke($null,@($Operation))
  try { $ocrTask.Wait() } catch { throw ('OCR '+$ResultType.FullName+' failed: '+$ocrTask.Exception.Flatten().InnerExceptions[0].Message) }
  return $ocrTask.Result
}
$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))
if ($null -eq $ocrEngine) { throw 'Installed en-US OCR unavailable; no package installation attempted.' }
$ocrItems = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$ocrResults = @()
foreach ($ocrItem in $ocrItems) {
  $ocrFile = Wait-OcrOperation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ocrItem.path)) ([Windows.Storage.StorageFile])
  $ocrStream = Wait-OcrOperation ($ocrFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  try {
    $ocrDecoder = Wait-OcrOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ocrStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $ocrBitmap = Wait-OcrOperation ($ocrDecoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    try {
      $ocrResult = Wait-OcrOperation ($ocrEngine.RecognizeAsync($ocrBitmap)) ([Windows.Media.Ocr.OcrResult])
      $ocrWords = @($ocrResult.Lines | ForEach-Object { $_.Words } | ForEach-Object { @{text=$_.Text;x=$_.BoundingRect.X;y=$_.BoundingRect.Y;width=$_.BoundingRect.Width;height=$_.BoundingRect.Height} })
      $ocrChecks = @()
      foreach ($ocrTarget in $ocrItem.targets) {
        $ocrBox=$ocrTarget.rect
        $ocrMatching=@($ocrWords | Where-Object { [math]::Min($ocrBox.x+$ocrBox.width,$_.x+$_.width)-[math]::Max($ocrBox.x,$_.x) -gt 0 -and [math]::Min($ocrBox.y+$ocrBox.height,$_.y+$_.height)-[math]::Max($ocrBox.y,$_.y) -gt .35*$_.height } | Sort-Object x)
        $ocrRead=($ocrMatching | ForEach-Object { $_.text }) -join ''
        $ocrNumeric=$ocrRead -replace '[^0-9.\-]',''
        $ocrMethod='Whole captured image;matched word bounds'
        if ($ocrNumeric -ne $ocrTarget.expected) {
          $ocrTransform=[Windows.Graphics.Imaging.BitmapTransform]::new()
          $ocrTransform.ScaledWidth=[uint32]($ocrDecoder.PixelWidth*$CropScale)
          $ocrTransform.ScaledHeight=[uint32]($ocrDecoder.PixelHeight*$CropScale)
          $ocrBounds=New-Object Windows.Graphics.Imaging.BitmapBounds
          $ocrBounds.X=[uint32][math]::Max(0,[math]::Floor(($ocrBox.x-$CropPadding)*$CropScale))
          $ocrBounds.Y=[uint32][math]::Max(0,[math]::Floor(($ocrBox.y-$CropPadding)*$CropScale))
          $ocrBounds.Width=[uint32][math]::Min($ocrTransform.ScaledWidth-$ocrBounds.X,[math]::Ceiling(($ocrBox.width+$CropPadding*2)*$CropScale))
          $ocrBounds.Height=[uint32][math]::Min($ocrTransform.ScaledHeight-$ocrBounds.Y,[math]::Ceiling(($ocrBox.height+$CropPadding*2)*$CropScale))
          $ocrTransform.Bounds=$ocrBounds
          $ocrCrop=Wait-OcrOperation ($ocrDecoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore,$ocrTransform,[Windows.Graphics.Imaging.ExifOrientationMode]::IgnoreExifOrientation,[Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage)) ([Windows.Graphics.Imaging.SoftwareBitmap])
          try { $ocrRegion=Wait-OcrOperation ($ocrEngine.RecognizeAsync($ocrCrop)) ([Windows.Media.Ocr.OcrResult]);$ocrRead=$ocrRegion.Text;$ocrNumeric=$ocrRead -replace '[^0-9.\-]','';$ocrMethod='Same captured bitmap;bounded numeric crop offline scale'+$CropScale+' padding'+$CropPadding } finally { $ocrCrop.Dispose() }
        }
        $ocrChecks += @{id=$ocrTarget.id;crew_id=$ocrTarget.crew_id;metric=$ocrTarget.metric;expected=$ocrTarget.expected;recognized=$ocrRead;numeric=$ocrNumeric;matched=($ocrNumeric -eq $ocrTarget.expected);method=$ocrMethod}
      }
      $ocrResults += @{file=$ocrItem.file;text=$ocrResult.Text;words=$ocrWords;checks=$ocrChecks}
    } finally { $ocrBitmap.Dispose() }
  } finally { $ocrStream.Dispose() }
  if ($ocrResults.Count % 30 -eq 0) { Write-Host ('OCR '+$ocrResults.Count+'/'+$ocrItems.Count) }
}
@{engine='Windows.Media.Ocr en-US';max_dimension=[Windows.Media.Ocr.OcrEngine]::MaxImageDimension;results=$ocrResults} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Output -Encoding UTF8
