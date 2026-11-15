param([Parameter(Mandatory=$true)][string]$Manifest,[Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$reviewItems=Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
if(Test-Path -LiteralPath $Directory){throw 'Use a fresh review directory.'}
$null=New-Item -ItemType Directory -Path $Directory
$reviewFont=[System.Drawing.Font]::new('Consolas',13)
try{
  for($reviewPage=0;$reviewPage -lt [math]::Ceiling($reviewItems.Count/40);$reviewPage++){
    $reviewCanvas=[System.Drawing.Bitmap]::new(1920,1000)
    $reviewGraphics=[System.Drawing.Graphics]::FromImage($reviewCanvas)
    try{
      $reviewGraphics.Clear([System.Drawing.Color]::FromArgb(5,5,8));$reviewGraphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor;$reviewGraphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
      for($reviewCell=0;$reviewCell -lt 40;$reviewCell++){
        $reviewIndex=$reviewPage*40+$reviewCell;if($reviewIndex -ge $reviewItems.Count){break};$reviewItem=$reviewItems[$reviewIndex]
        $reviewX=($reviewCell%8)*240;$reviewY=[math]::Floor($reviewCell/8)*200
        $reviewGraphics.DrawString(('ID '+$reviewItem.index+' '+$reviewItem.metric),$reviewFont,[System.Drawing.Brushes]::White,$reviewX+5,$reviewY+4)
        $reviewSource=[System.Drawing.Bitmap]::FromFile($reviewItem.file)
        try{
          $reviewBox=$reviewItem.rect;$reviewLeft=[math]::Max(0,[math]::Floor($reviewBox.x)-8);$reviewTop=[math]::Max(0,[math]::Floor($reviewBox.y)-8)
          $reviewWidth=[math]::Min($reviewSource.Width-$reviewLeft,[math]::Ceiling($reviewBox.width)+16);$reviewHeight=[math]::Min($reviewSource.Height-$reviewTop,[math]::Ceiling($reviewBox.height)+16)
          $reviewScale=[math]::Min(220/$reviewWidth,165/$reviewHeight)
          $reviewDest=[System.Drawing.Rectangle]::new($reviewX+8,$reviewY+28,[int]($reviewWidth*$reviewScale),[int]($reviewHeight*$reviewScale))
          $reviewGraphics.DrawImage($reviewSource,$reviewDest,[System.Drawing.Rectangle]::new($reviewLeft,$reviewTop,$reviewWidth,$reviewHeight),[System.Drawing.GraphicsUnit]::Pixel)
        }finally{$reviewSource.Dispose()}
      }
      $reviewCanvas.Save((Join-Path $Directory ('sheet-'+($reviewPage+1)+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
    }finally{$reviewGraphics.Dispose();$reviewCanvas.Dispose()}
  }
}finally{$reviewFont.Dispose()}
Write-Host ('Saved '+[math]::Ceiling($reviewItems.Count/40)+' offline review sheets. Expected values are deliberately absent;original PNGs are unchanged. These are review crops,not new timed browser captures.')
