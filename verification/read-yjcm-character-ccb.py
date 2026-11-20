"""只读解析已确认 APK 中的 CocosBuilder v5 人物卡布局，不执行客户端代码。"""
import struct,json,zipfile,hashlib
from pathlib import Path
class Reader:
 def __init__(self,b):self.b=b;self.p=4
 def byte(self):v=self.b[self.p];self.p+=1;return v
 def integer(self,signed=False):
  bit=0
  def readbit():
   nonlocal bit
   v=(self.b[self.p]>>bit)&1;bit+=1
   if bit==8:self.p+=1;bit=0
   return v
  n=0
  while not readbit():n+=1
  v=1<<n
  for a in range(n-1,-1,-1):v|=readbit()<<a
  if bit:self.p+=1
  return (v//2 if v%2 else -v//2) if signed else v-1
 def string(self):return self.strings[self.integer()]
 def float(self):
  t=self.byte()
  if t<4:return [0,1,-1,.5][t]
  if t==4:return self.integer(True)
  v=struct.unpack_from('<f',self.b,self.p)[0];self.p+=4;return v
 def utf8(self):
  n=struct.unpack_from('>H',self.b,self.p)[0];self.p+=2
  v=self.b[self.p:self.p+n].decode('utf-8');self.p+=n;return v
 def property(self,t):
  if t in [0,1,4]:return [self.float(),self.float(),self.integer()]
  if t in [2,3,8,27]:return [self.float(),self.float()]
  if t in [5,7]:return self.float()
  if t in [6,20]:return self.integer(True)
  if t in [9,12]:return self.byte()
  if t in [10,22]:return [self.string(),self.string()]
  if t in [11,17,18,19,23,24]:return self.string()
  if t==13:return [self.byte() for _ in range(3)]
  if t==14:return [self.float() for _ in range(8)]
  if t==15:return [self.byte(),self.byte()]
  if t==16:return [self.integer(),self.integer()]
  if t==21:return [self.string(),self.integer()]
  if t==25:return [self.string(),self.integer(),self.integer()]
  if t==26:return [self.float(),self.integer()]
  raise ValueError((t,self.p))
 def node(self):
  start=self.p;n={'class':self.string()};assignment=self.integer()
  if assignment:n['assignment']=[assignment,self.string()]
  animations=self.integer();assert animations==0,('animated',animations,self.p)
  regular,extra=self.integer(),self.integer();props={}
  for _ in range(regular+extra):
   t=self.integer();key=self.string();platform=self.byte();props[key]=self.property(t)
  n['properties']=props;n['children']=[self.node() for _ in range(self.integer())];n['offset']=start
  return n
 def read(self):
  assert self.b[:4]==b'ibcc';assert self.integer()==5;assert self.byte()==0
  self.strings=[self.utf8() for _ in range(self.integer())]
  sequences=[]
  for _ in range(self.integer()):
   sequences.append([self.float(),self.string(),self.integer(),self.integer(True)])
   assert self.integer()==0;assert self.integer()==0
  auto=self.integer(True);tree=self.node();assert self.p==len(self.b),(self.p,len(self.b))
  return tree

ROOT=Path(__file__).resolve().parents[1]
def main():
 member='assets/res/new/data/ccb/seatInfo.ccbi'
 with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as apk:b=apk.read(member)
 tree=Reader(b).read();selected=[]
 def walk(n):
  if n['properties'].get('tag') in [200,201,202,203,204,101]:selected.append({k:v for k,v in n.items() if k!='children'})
  for child in n['children']:walk(child)
 walk(tree)
 report={'member':member,'sha256':hashlib.sha256(b).hexdigest(),'format':'CocosBuilder v5; parsed all bytes, no trailing data','reader_format_reference':'https://github.com/cocos2d/CCBReader/blob/master/CCBReader/CCBReader.m','root':tree['properties'],'selected_nodes':selected,'override_notes':['GeneralCardCcbNode.createChilden hides native _kuang1 and old HP. GeneralYjcmHpContainer and GeneralYjcmCountryContainer replace old tags202/203/204/101.','Static source graph; not an official client runtime capture.']}
 (ROOT/'verification/yjcm-character-ccb.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
 print('CCB_FULL_PARSE_OK',len(b),'bytes,',len(selected),'selected nodes')
if __name__=='__main__':main()
