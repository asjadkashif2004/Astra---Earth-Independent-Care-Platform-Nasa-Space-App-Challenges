from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
W=Path(__file__).parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
for slug,pages in [('user-guide',[1,2,4,6,7,11,12]),('technical-report',[1,3,5,10,17,21,25,27,30])]:
 out=Image.new('RGB',(1200,((len(pages)+2)//3)*485),'#dae4ed');draw=ImageDraw.Draw(out)
 for i,p in enumerate(pages):
  im=Image.open(W/f'{slug}-pdf-page-{p}.png').convert('RGB');im.thumbnail((390,445));x=(i%3)*400;y=(i//3)*485
  draw.text((x+8,y+3),f'{slug} · page {p}',fill='#102e4a',font=font);out.paste(im,(x+5,y+30))
 out.save(W/(slug+'-contact-sheet.png'),optimize=True)
