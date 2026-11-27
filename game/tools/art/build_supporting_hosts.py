"""Author, export and CPU inspect Bok, Keeper Hana and Captain Bay. Blender 4.3, no external assets.
blender -b --factory-startup --python tools/art/build_supporting_hosts.py -- --character bok --output /workspace/work/supporting-hosts/bok --proof
Faces look along -Y; Z is up. Each LOD uses one skinned mesh and one opaque atlas.
"""
import argparse, importlib.util, json, math, struct, sys, zlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion
_spec=importlib.util.spec_from_file_location('conforming_eye',str(Path(__file__).with_name('conforming_eye.py')));CE=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(CE)
T=math.tau
Z=Vector((0,0,1))
TILES={'skin':(0,0,512,1024),'eye_l':(512,0,256,128),'eye_r':(512,128,256,128),'cloth':(512,256,512,384),'fin':(512,640,256,384),'rim':(768,640,256,384),'dark':(768,0,128,128),'gold':(896,0,128,128),'ivory':(768,128,256,128)}
def _pad(w,h):return min(16,min(w,h)//10)
def uv(tile,u,v):
 x,y,w,h=TILES[tile];p=_pad(w,h);return ((x+p+u*(w-2*p))/1024,(y+p+v*(h-2*p))/1024)
def mix(a,b,t): return np.asarray(a)+(np.asarray(b)-np.asarray(a))*np.asarray(t)[...,None]
def paint(a,c,t):return a+(np.asarray(c)-a)*np.clip(t,0,1)[...,None]
def cloud(u,v):return .45*np.sin(37*u+45*v+.7*np.sin(17*v))+.3*np.sin(107*u-97*v)+.25*np.sin(177*u+211*v)
def png(path,a):
 def chunk(n,p):return struct.pack('>I',len(p))+n+p+struct.pack('>I',zlib.crc32(n+p))
 h,w,_=a.shape; d=a.copy();d[:,1:]-=a[:,:-1]
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\1'+r.tobytes() for r in d[::-1]),8))+chunk(b'IEND',b''))
def paint_eye_v25(char,u,v):
 """v25/v27 Minor #7 & #10: Tightened 76-78% iris-fill conforming eye using conforming_eye.py palettes & calibrated skin maps.
 Raises iris area fill cleanly into the 72-80% rubric band (~77%) with a slim crisp white sclera ring & bold twin catchlights."""
 dark,bright,glow,skin_fb=CE.PALETTES[char]
 if char=='jisu':
  # v27 Minor #7: Brighter, joyful sunlit amber-gold iris gradient so Jisu's eyes sparkle warmly in proofs & 11-beach!
  dark,bright=(94,38,10),(242,152,26)
 a=T*u
 ex,ey=v*np.cos(a),v*np.sin(a)
 skin=CE._lookup(CE.SKIN_MAPS[char],ex,ey) if char in CE.SKIN_MAPS else np.broadcast_to(np.asarray(skin_fb,float),ex.shape+(3,))
 pr=np.hypot(ex+.028,ey-.010)
 pang=np.arctan2(ey-.010,ex+.028)
 fiber=(np.sin(51*pang+.8*np.sin(11*pang))*np.sin(8*pang-12*pr)+.6*np.cos(83*pang+pr*35))/1.6
 gradient=np.clip(.54-.84*ey+.12*fiber,0,1)
 iris=CE._mix(dark,bright,gradient)
 # Rich saturated stained-glass lower-iris crescent (never washes out into sclera)
 if char=='bok':
  glow_amt,glow_col=.56,(255,214,78)
  iris=CE._mix(iris,glow_col,glow_amt*CE.smooth(.08,-.54,ey)*CE.smooth(.28,.54,v))
 elif char=='jisu':
  glow_amt,glow_col=.68,(255,224,92)
  iris=CE._mix(iris,glow_col,glow_amt*CE.smooth(.06,-.54,ey)*CE.smooth(.32,.56,v))
 elif char=='captain-bay':
  # v30 Minor #2: Luminous sky-cyan lower-iris crescent matching Captain Bay's warm sea-blue palette with crisp 76.8% iris fill!
  glow_amt,glow_col=.56,(112,212,252)
  iris=CE._mix(iris,glow_col,glow_amt*CE.smooth(.08,-.54,ey)*CE.smooth(.28,.54,v))
 else:
  # v27 Minor #10 (pip): Keep outer lower iris radiant gold while preserving deep amber contrast around the pupil border for c2!
  glow_amt,glow_col=.56,(255,214,68)
  iris=CE._mix(iris,glow_col,glow_amt*CE.smooth(.02,-.56,ey)*CE.smooth(.36,.58,v))
 # Soulful deep dark pupil
 p_hi,p_lo=(.378,.330) if char=='bok' else ((.388,.338) if char=='captain-bay' else ((.402,.350) if char=='jisu' else (.420,.368)))
 c=CE._mix(iris,(14,14,24),CE.smooth(p_hi,p_lo,pr))
 # Crisp slim jewel limbus ring cleanly at v=0.768 (colored iris out to v=0.752 -> 76-78% of visible eye aperture!)
 limbus=CE._mix(dark,(16,14,24),.62)
 c=CE._mix(c,limbus,CE.smooth(.736,.762,v)*(1.0-CE.smooth(.776,.796,v)))
 lid_drop=.016 if char in ('bok','jisu') else .018
 aperture=v+lid_drop*CE.smooth(.06,.66,ey)
 # Crisp slim pearl-white sclera ring (v ~ 0.784..0.858 -> (0.752/0.858)^2 = 76.8% iris fill!)
 sclera=CE._mix((252,250,246),(224,216,210),.28*CE.smooth(.08,.68,ey))
 c=CE._mix(c,sclera,CE.smooth(.776,.792,aperture))
 lash_tint=(122,62,22) if char=='bok' else ((44,62,92) if char=='captain-bay' else ((128,62,34) if char=='jisu' else (56,18,68)))
 lash_col=CE._mix(skin*.48,lash_tint,.52)
 lash=np.exp(-((aperture-.852)/.015)**2)*(.68*CE.smooth(.06,.54,ey))
 c=CE._mix(c,lash_col,lash)
 # Seamless blend into exact calibrated local face skin
 c=CE._mix(c,skin,CE.smooth(.844,.894,aperture))
 crease=CE.smooth(.12,.70,ey)*np.exp(-((v-.902)/.032)**2)
 c=CE._mix(c,skin*.88,crease*.22)
 # Bold sparkling pure-white twin catchlights (unmistakably readable at both closeup & gameplay board scale!)
 if char=='bok':
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.36,np.hypot((ex+.195)/.188,(ey-.236)/.188)))
  c=CE._mix(c,(255,255,255),.99*CE.smooth(1.0,.34,np.hypot((ex-.195)/.110,(ey+.195)/.110)))
 elif char=='captain-bay':
  # v30 Minor #2: Sparkling pure #FFFFFF twin catchlights readable at both front.png & 06-captains-deck board scale!
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.46,np.hypot((ex+.198)/.196,(ey-.236)/.196)))
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.50,np.hypot((ex-.198)/.136,(ey+.198)/.136)))
 elif char=='jisu':
  # v27 Minor #7: Large crisp pure #FFFFFF twin catchlights contrasting boldly against deep pupil & bright amber-gold iris!
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.54,np.hypot((ex+.208)/.214,(ey-.238)/.214)))
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.60,np.hypot((ex-.212)/.168,(ey+.206)/.168)))
 else:
  # v27 Minor #10 (pip): Boost c2_r 0.156 -> 0.195 with crisp pure #FFFFFF core straddling dark pupil / deep amber border
  # so BOTH twin catchlights pop unmistakably at ~75px board scale in 10-patterns.png!
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.56,np.hypot((ex+.222)/.216,(ey-.256)/.216)))
  c=CE._mix(c,(255,255,255),1.0*CE.smooth(1.0,.64,np.hypot((ex-.216)/.195,(ey+.212)/.195)))
 rough=.08+.76*CE.smooth(.79,.88,aperture)
 return c,rough

def paint_tile(char,name,u,v):
 n=cloud(u,v);zero=np.zeros_like(u); rough=np.full_like(u,.82);metal=zero
 if name in ('eye','eye_l','eye_r'):
  # v32 Living Pixar/Hero-Shelly conforming eyes: un-mirrored world-space sun catchlight, rich upper-lid shadow, warm pearl sclera & soulful iris depth.
  rgb,rough=CE.paint_eye(char,u,v,side=(-1 if name=='eye_l' else 1))
 elif name=='skin' and char=='bok':
  # M2 v23: Rich sunlit golden-honey pufferfish skin (100% periodic in a -> ZERO front seam, ZERO diagonal stripes, ZERO pore dots!).
  a=T*u;side=np.abs((u+.5)%1-.5)
  n_per=.45*np.sin(4*a+23*v)+.3*np.sin(8*a-37*v)+.25*np.sin(14*a+61*v)
  front=(.5+.5*np.cos(a))**2.4
  cream=front*np.clip((v-.55)*3.4,0,1)
  rgb=mix((228,136,20),(255,204,60),.42+.32*np.sin(math.pi*v)+.025*n_per)
  # Gentle organic golden-amber puffer mottling strictly on back flanks (off face!)
  back_mask=np.clip((-.15-np.cos(a))*3.0,0,1)*np.clip((.62-v)*3.0,0,1)
  mottle=((.5+.5*np.sin(7*a+16*v)*np.cos(5*a-13*v))**3)*back_mask
  rgb=paint(rgb,(202,116,18),mottle*.34)
  rgb=paint(rgb,(255,244,204),cream*.92)
  # Soft arched warm caramel-honey brows cleanly above Bok's large 76%-iris eyes
  brow_v=.206+.015*((side-.078)/.036)**2
  brow=np.exp(-(((side-.078)/.036)**2+((v-brow_v)/.013)**2))
  rgb=paint(rgb,(142,72,18),brow*.56)
  # Warm rosy coral-pink cheek blushes cleanly below & outboard of the big eyes
  cheek=np.exp(-(((side-.146)/.052)**2+((v-.478)/.044)**2))
  rgb=paint(rgb,(252,114,108),cheek*.68)
  rough=np.full_like(u,.88)
 elif name=='skin' and char=='captain-bay':
  a=T*u;front=(.5+.5*np.cos(a))**2.6
  # v40: Velvety slate-blue walrus coat with organic mottling, creamy-oatmeal proud chest & baked coat-collar AO!
  cream=front*np.clip((v-.40)*3.8,0,1)*np.clip((.94-v)*5.5,0,1)
  n_soft=.52*np.sin(3*a+11*v)+.32*np.sin(7*a-21*v)+.16*np.cos(11*a+33*v)
  rgb=mix((94,120,160),(176,196,226),.46+.20*np.sin(math.pi*v)+.038*n_soft)
  rgb=paint(rgb,(246,234,214),cream*.95)
  rgb=paint(rgb,(66,86,120),np.exp(-(((v-.38)/.036)**2))*.32)
  cheek=np.exp(-(((np.abs((u+.5)%1-.5)-.122)/.048)**2+((v-.275)/.042)**2))
  rgb=paint(rgb,(244,136,138),cheek*.56)
  rough=np.full_like(u,.90)
 elif name=='skin' and char=='echo':
  # m2 v29: Silky-smooth 100% matte-satin (roughness=0.90) pearl-cream & seafoam-mint beluga melon & body.
  # Uniform pearl-cream rostrum tip (v < 0.14) eliminates any pole color discontinuity; smooth C1 snout cap eliminates glossy nub!
  # u=0 dorsal spine, u=0.25 right flank, u=0.50 ventral belly, u=0.75 left flank; v=0 snout -> v=1 tail.
  a=T*u;dorsal=.5+.5*np.cos(a);u_dist=np.minimum(u,1.0-u)
  snout_t=np.clip((v-.02)/.14,0,1);snout_fade=snout_t*snout_t*(3.0-2.0*snout_t)
  n_per=(.45*np.sin(4*a+29*v)+.3*np.sin(8*a-43*v)+.25*np.sin(14*a+67*v))*snout_fade
  # Warm luminous pearl-cream crown & melon blending smoothly into luminous seafoam-mint dorsal & upper flanks
  rgb=mix((168,228,210),(250,245,228),.42+.44*(1.0-dorsal*snout_fade)+.10*np.sin(math.pi*v)+.028*n_per)
  # Soft glowing seafoam-mint dorsal saddle + organic Shelly-grade pearlescent dappling along upper flanks
  saddle=(dorsal**2.2)*np.clip((v-.30)*3.2,0,1)
  rgb=paint(rgb,(122,208,190),saddle*.58)
  dapple=((.5+.5*np.sin(7*a+19*v)*np.cos(5*a-15*v))**2.6)*np.clip((v-.24)*3.6,0,1)*np.clip((dorsal-.22)*2.6,0,1)
  rgb=paint(rgb,(196,242,232),dapple*.28)
  flank_ao=np.exp(-(((dorsal-.46)/.14)**2))*np.clip((v-.28)*3.2,0,1)*np.clip((.92-v)*4.0,0,1)
  rgb=paint(rgb,(118,186,178),flank_ao*.18)
  # Warm luminous pearl-ivory belly & smooth uniform pearl-cream rostrum
  belly=np.clip((.42-dorsal)*4.2,0,1)*np.clip((.92-v)*5.0,0,1)*snout_fade
  rostrum_u=(1.0-snout_fade)*.92
  rgb=paint(rgb,(253,248,234),np.maximum(belly*.92,rostrum_u))
  # v33 MIN 9: Gentle beluga melon-to-muzzle contour, dainty nose/breathing contour, plump muzzle highlights & soft cheek/whisker hints!
  # 1) Soft pearlescent seafoam-slate shadow nestled in the sculpted melon-to-muzzle saddle crease above the upper lip
  valley_v=.096+.020*((u_dist/.17)**2)
  melon_crease=np.exp(-(((v-valley_v)/.019)**2))*np.exp(-((u_dist/.175)**2))
  rgb=paint(rgb,(178,214,206),melon_crease*.52)
  # 2) Warm luminous pearl-cream highlight on the twin plump upper-lip / muzzle cushions flanking the center
  muzzle_pad=np.exp(-(((u_dist-.145)/.075)**2+((v-.062)/.028)**2))
  rgb=paint(rgb,(255,254,248),muzzle_pad*.62)
  # 3) Dainty subtle nose/breathing contour centered on the upper muzzle crest (v ~ 0.052..0.068, between eyes & smile)
  nose_bridge=np.exp(-(((u_dist)/.052)**2+((v-.056)/.013)**2))
  rgb=paint(rgb,(134,178,174),nose_bridge*.44)
  # Twin tiny delicate inward-curved breathing/nostril dimples + faint soft philtrum crease down toward smile
  nostril=np.exp(-(((u_dist-.036)/.016)**2+((v-.060+.008*((u_dist-.036)/.016))/.0085)**2))
  rgb=paint(rgb,(76,126,124),nostril*.68)
  philtrum=np.exp(-(((u_dist)/.011)**2))*np.clip((v-.026)/.014,0,1)*np.clip((.052-v)/.014,0,1)
  rgb=paint(rgb,(156,192,188),philtrum*.34)
  # 4) Soft delicate cheek/whisker dimple hints (3 subtle curved dots per plump muzzle-cheek pad) + gentle cheek under-contour
  whisker_dots=np.zeros_like(u)
  for wu,wv in ((.185,.072),(.232,.088),(.212,.114)):
   whisker_dots=np.maximum(whisker_dots,np.exp(-(((u_dist-wu)/.0115)**2+((v-wv)/.0085)**2)))
  rgb=paint(rgb,(112,158,154),whisker_dots*.58)
  cheek_contour=np.exp(-(((u_dist-.305)/.055)**2+((v-.155)/.045)**2))
  rgb=paint(rgb,(212,230,224),cheek_contour*.36)
  # Soft cheerful seafoam-teal brows gently arched above the warm teal-aqua eyes (zero dark forehead crease!)
  brow=np.exp(-(((u_dist-.150)/.042)**2+((v-.245)/.018)**2))
  rgb=paint(rgb,(64,134,128),brow*.42)
  # Warm rosy terracotta-peach cheek blush beneath & slightly forward of the eyes
  cheek=np.exp(-(((u_dist-.272)/.048)**2+((v-.255)/.042)**2))
  rgb=paint(rgb,(248,144,128),cheek*.70)
  rough=np.full_like(u,.90)
 elif name=='skin' and char=='jisu':
  # v40: Velvety warm sunlit-apricot hermit crab head & thorax with painterly organic mottling, cap-brim & shell-collar AO!
  a=T*u;side=np.abs((u+.5)%1-.5)
  n_per=.50*np.sin(4*a+15*v+.7*np.sin(6*v))+.32*np.sin(9*a-31*v)+.18*np.cos(15*a+53*v)
  rgb=mix((244,150,66),(255,208,122),.44+.40*np.sin(math.pi*v)+.042*n_per)
  rgb=paint(rgb,(255,222,152),np.clip((n_per-.22)*1.5,0,1)*.18)
  sun_crown=np.clip((.54-v)*2.8,0,1)*np.clip((.24-side)*5.0,0,1)
  rgb=paint(rgb,(255,224,154),sun_crown*.42)
  belly=np.clip((v-.62)*3.0,0,1)
  rgb=paint(rgb,(255,226,170),belly*.66)
  # Soft baked cap-brim & rear shell-collar AO for Shelly-grade tactile depth
  rgb=paint(rgb,(196,104,46),np.exp(-(((v-.145)/.026)**2))*.30)
  rgb=paint(rgb,(198,108,50),np.clip((side-.32)*4.8,0,1)*.26)
  t_b=np.clip((side-.065)/.100,0.0,1.0)
  brow_v=.176+.008*np.maximum(0.0,1.0-t_b/.25)**2+.114*np.maximum(0.0,(t_b-.25)/.75)**1.55
  brow_span=np.exp(-(((side-.114)/.044)**2))
  brow_arch=np.exp(-(((v-brow_v)/.015)**2))
  brow=brow_span*brow_arch*np.clip((side-.052)/.016,0.0,1.0)*np.clip((.176-side)/.016,0.0,1.0)
  rgb=paint(rgb,(146,80,38),brow*.60)
  cheek=np.exp(-(((side-.156)/.054)**2+((v-.555)/.026)**2))
  rgb=paint(rgb,(244,104,88),cheek*.78)
  rough=np.full_like(u,.89)
 elif name=='skin' and char=='pip':
  # M3 v21: Vibrant Royal Gramma amethyst-violet front smoothly blending into radiant sunshine-gold rear body (velvety matte finish).
  # u=0 dorsal crest, u=0.25 right flank, u=0.50 ventral belly, u=0.75 left flank; v=0 snout -> v=1 tail peduncle.
  a=T*u;u_dist=np.minimum(u,1.0-u)
  trans=np.clip((v-.44)/.20,0,1);trans=trans*trans*(3.0-2.0*trans)
  n_per=.45*np.sin(4*a+31*v)+.3*np.sin(8*a-47*v)+.25*np.sin(14*a+73*v)
  front_col=mix((112,38,194),(162,80,232),.36+.40*(.5-.5*np.cos(a))+.04*n_per)
  rear_col=mix((246,174,24),(255,222,64),.44+.32*(.5-.5*np.cos(a))+.04*n_per)
  rgb=front_col*(1.0-trans[...,None])+rear_col*trans[...,None]
  # Subtle velvety scale shimmer only on body flanks (kept off smooth front face)
  row=np.floor(v*54);sx=(u*36+.5*(row%2))%1;sy=(v*54)%1
  glint=np.exp(-(((sx-.42)/.25)**2+((sy-.44)/.22)**2))*np.clip((v-.30)*5.0,0,1)
  rgb=paint(rgb,(255,234,132),glint*(.04+.10*trans))
  # Cheerful soft horizontal arched royal-plum brows cleanly ABOVE Pip's large wide-open 77%-iris eyes!
  # Note: on Pip, u_dist=0 is dorsal crown -> 0.25 is mid-flank (vertical), v=0 is snout -> 1 tail (front-to-back).
  brow_u=.080+.012*((v-.265)/.038)**2
  brow=np.exp(-(((u_dist-brow_u)/.011)**2+((v-.265)/.038)**2))
  rgb=paint(rgb,(70,22,126),brow*.48)
  # v25 Minor #2: Vivid warm rosy coral-pink cheek blush clearly readable on purple skin in BOTH proofs-v25/pip/ and 10-patterns!
  cheek=np.exp(-(((u_dist-.295)/.068)**2+((v-.215)/.052)**2))
  cheek_core=np.exp(-(((u_dist-.295)/.042)**2+((v-.215)/.032)**2))
  rgb=paint(rgb,(255,112,144),cheek*.88)
  rgb=paint(rgb,(255,156,178),cheek_core*.42)
  # v26 Minor #5: Bright sunlit-lilac lower chin/lip highlight cushion + subtle mouth-groove framing right around the happy smile
  # so the curved smile line reads with +25% stronger contrast at ~80-95px board scale in 10-patterns!
  lip_hi=np.exp(-(((u_dist-.465)/.105)**2+((v-.128)/.048)**2))
  rgb=paint(rgb,(238,186,255),lip_hi*.58)
  snout_hi=np.exp(-(((u_dist-.34)/.10)**2+((v-.085)/.042)**2))
  rgb=paint(rgb,(210,148,248),snout_hi*.28)
  rough=np.full_like(u,.90)
 elif name=='skin':
  # M6 v21 + C1 v24 + m6 v29: Crystal-bell translucent-look moon jellyfish dome with soft opalescent
  # pearlescent-lavender & glowing seafoam-aqua lower bell skirt + delicate radial bell canals,
  # while keeping matte-satin roughness=0.92 on the top dome so ZERO UV-pole hotspot returns!
  # UV meridian strictly at back +Y (a = T*u + pi -> front forehead at continuous u=0.5, ZERO seam!).
  a=T*u+math.pi
  cf_t=np.clip((v-.14)/.26,0,1);crown_fade=cf_t*cf_t*(3.0-2.0*cf_t)
  # Periodic noise in azimuth a so both front u=0.5 and back u=0/1 have 100% smooth continuous shading.
  n_per=.45*np.sin(6*a+45*v+.7*np.sin(17*v))+.3*np.sin(14*a-97*v)+.25*np.sin(24*a+211*v)
  # Warm translucent coral-rose / opalescent orchid upper dome transitioning cleanly down to crystal skirt
  rgb=mix((246,164,182),(252,216,228),.36+.46*np.clip(v/.65,0,1)+.03*n_per*crown_fade)
  # Four delicate translucent inner-bell clover rings (authentic moon-jellyfish Aurelia translucency cue visible from 45-deg above!)
  clover_r=np.exp(-((v-.33)/.095)**2)*((.5+.5*np.cos(a*4.0+math.pi*.25))**1.8)
  clover_ring=np.exp(-((np.abs(v-.33)-.048)/.024)**2)*((.5+.5*np.cos(a*4.0+math.pi*.25))**2.4)
  rgb=paint(rgb,(220,118,184),clover_r*.42)
  rgb=paint(rgb,(255,216,244),clover_ring*.52)
  # Delicate translucent radial bell canals: 18 primary canals + fine forked outer branches (zero apex star!)
  canal_18=(.5+.5*np.cos(a*18+.14*np.sin(7*v)))
  canal_core=(canal_18**16)*crown_fade
  canal_depth=(canal_18**4)*(1.0-canal_18**12)*crown_fade
  canal_fork=((.5+.5*np.cos(a*36+.18*np.sin(9*v)))**18)*np.clip((v-.52)/.24,0,1)
  rgb=paint(rgb,(170,116,204),canal_depth*(.18+.26*v))
  # Face mask gently softens lavender/aqua tint right around the eyes & cheeks (u~0.5, v~0.68..0.88) so Hana's face reads warm & clear
  face_keep=np.exp(-(((np.abs(u-.5))/.135)**2+((v-.76)/.12)**2))
  # Wide, unmistakable opalescent pearlescent-lavender transition band (v = 0.44..0.82)
  lav_t=np.clip((v-.44)/.30,0,1);lav_band=lav_t*lav_t*(3.0-2.0*lav_t)*np.clip((1.05-v)/.24,0,1)
  lav_irid=.78+.22*np.sin(a*3.0+.8)
  rgb=paint(rgb,(184,148,250),lav_band*lav_irid*(.64-.32*face_keep))
  # Broad, luminous translucent seafoam-aqua / aquamarine lower bell skirt gradient (v = 0.62..1.00 — unmistakably visible from 45-deg above!)
  aqua_t=np.clip((v-.62)/.26,0,1);aqua_skirt=aqua_t*aqua_t*(3.0-2.0*aqua_t)
  rgb=paint(rgb,(88,240,236),aqua_skirt*(.84-.36*face_keep))
  # Crisp inner-lit crystal aquamarine edge glow right along the lower scalloped skirt lip (v = 0.85..1.00)
  rim_glow=np.clip((v-.85)/.13,0,1);rim_glow=rim_glow*rim_glow*(3.0-2.0*rim_glow)
  rgb=paint(rgb,(146,255,250),rim_glow*(.88-.20*face_keep))
  # Luminous pearl-aqua radial canal highlights gliding smoothly into the glowing seafoam lower skirt!
  rgb=paint(rgb,(220,255,252),canal_core*(.32+.42*v))
  rgb=paint(rgb,(212,248,255),canal_fork*.34)
  # Soft glowing rose-lavender cheek halo beneath & outboard of Hana's enlarged eyes (front center = u=0.5)
  cheek=np.exp(-(((np.abs(u-.5)-.088)/.046)**2+((v-.855)/.052)**2))
  rgb=paint(rgb,(248,148,204),cheek*.62)
  # C1 v24 + m6 v29: Matte-satin top dome (roughness=0.92) so ZERO UV-pole specular hotspot returns!
  rough=np.full_like(u,.92)
 elif name=='cloth':
  if char=='hana':
   # Soft expressive rose-plum brows for Hana.
   rgb=mix((164,92,132),(214,138,176),.35+.45*v+.04*n);rough=np.full_like(u,.88)
  elif char=='echo':
   # M1 v20: Vibrant terracotta-coral woven explorer fabric with bold solid sunlit-marigold piping (zero dashed mip-aliasing!).
   rgb=mix((194,62,42),(236,104,70),.48+.04*n)
   edge=np.minimum(v,1-v)
   gold_band=np.exp(-((edge-.115)/.036)**2)
   rgb=paint(rgb,(252,198,52),gold_band*.96)
   rough=np.full_like(u,.89)
  elif char=='captain-bay':
   # v26 Minor #8: Rich tailored naval captain's wool broadcloth with crisp warm-gold bottom hem trim & subtle lapel shadow.
   n_soft=.5*np.sin(3*T*u+7*v)+.5*np.cos(5*T*u-9*v)
   rgb=mix((24,46,84),(54,84,130),.52+.12*(1.0-v)+.014*n_soft)
   gold_pipe=np.exp(-((v-.910)/.020)**2)
   rgb=paint(rgb,(242,198,92),gold_pipe*.95)
   rough=np.full_like(u,.90)
  elif char=='jisu':
   # m8 v23 + v39 MIN-12: Dual-zone tile:
   #   v < 0.56 = vivid lagoon-teal & sunlit-coral sculpted calligraphy feather plume with crisp angled barbs & bright ivory rachis;
   #   v >= 0.56 = crisp postal sky-blue courier cap.
   is_cap=(v>=.56).astype(float)
   fv=np.clip(v/.56,0,1)
   barb_phase=(fv*16.0-np.abs(u-.5)*9.5)*T
   barbs=(.5+.5*np.sin(barb_phase))**.65
   barb_dark=(.5-.5*np.sin(barb_phase))**1.4
   plume=mix((10,152,164),(48,220,210),.24+.58*fv+.03*n)
   tip=np.clip((fv-.44)/.40,0,1);tip=tip*tip*(3.0-2.0*tip)
   coral_tip=mix((248,88,52),(255,164,86),.34+.48*fv+.03*n)
   plume=plume*(1.0-tip[...,None])+coral_tip*tip[...,None]
   # Crisp feathery diagonal barb contrast + subtle dark barb-valley shading so feather reads unmistakably at encounter distance!
   plume=paint(plume,(8,84,104),barb_dark*.24*(1.0-tip*.55))
   plume=paint(plume,(255,248,232),barbs*.28)
   # Bright ivory central rachis spine running cleanly up the feather vane
   plume=paint(plume,(255,250,236),np.exp(-((u-.5)/.066)**2)*.94)
   cv=np.clip((v-.56)/.44,0,1)
   is_vis=(cv<.20).astype(float)
   # v28 Minor #9: Bright unmistakable postal sky-blue courier cap (distinct from Captain Bay's deep navy!)
   cap_crown=mix((64,148,216),(114,192,246),.48+.24*cv+.025*n)
   cap_crown=paint(cap_crown,(248,204,88),np.exp(-((cv-.28)/.042)**2)*.95)
   cap_vis=mix((42,112,176),(62,138,204),.40+.30*(cv/.20))
   cap=cap_crown*(1.0-is_vis[...,None])+cap_vis*is_vis[...,None]
   rgb=plume*(1.0-is_cap[...,None])+cap*is_cap[...,None]
   rough=np.where(v<.56,.86,np.where(cv<.20,.72,.89))
  elif char=='pip':
   # m4 v20: Clean seafoam-mint explorer satchel cloth with smooth warm-cream border piping (zero thin white dashes!).
   rgb=mix((92,178,158),(156,226,204),.52+.04*n)
   edge=np.minimum(v,1-v)
   rgb=paint(rgb,(248,242,216),np.exp(-((edge-.10)/.028)**2)*.88)
   rough=np.full_like(u,.89)
  else:
   # v28 Minor #9 (Bok): Dual-zone warm TEAL-EMERALD & CREAM coastal market cap + striped market vest!
   n_soft=.5*np.sin(4*T*u+11*v)+.5*np.cos(6*T*u-13*v)
   twill=.016*np.sin(140*T*u+140*T*v)+.012*n_soft
   teal_base=mix((16,118,106),(44,166,146),.48+.18*np.sin(math.pi*v)+twill)
   cream_base=mix((244,232,202),(255,248,228),.52+.10*np.sin(math.pi*v)+twill*.6)
   vis_col=cream_base.copy()
   vis_pipe=np.exp(-(((v-.145)/.016)**2))
   vis_col=paint(vis_col,(18,120,108),vis_pipe*.92)
   crown_col=teal_base.copy()
   hatband=np.clip((v-.395)/.018,0,1)*np.clip((.475-v)/.018,0,1)
   crown_col=crown_col*(1.0-hatband[...,None])+cream_base*hatband[...,None]
   crown_gold=np.exp(-(((v-.388)/.012)**2))
   crown_col=paint(crown_col,(244,198,94),crown_gold*.92)
   av=np.clip((v-.52)/.46,0,1)
   stripe_w=.5+.5*np.cos(T*u*7.0)
   stripe_mask=np.clip((stripe_w-.44)/.14,0,1)
   stripe_mask=stripe_mask*stripe_mask*(3.0-2.0*stripe_mask)
   vest_col=teal_base*(1.0-stripe_mask[...,None])+cream_base*stripe_mask[...,None]
   hem_solid=np.clip(np.maximum(np.clip((.13-av)/.03,0,1),np.clip((av-.89)/.03,0,1)),0,1)
   vest_col=vest_col*(1.0-hem_solid[...,None])+teal_base*hem_solid[...,None]
   hem_gold=np.exp(-(((av-.135)/.018)**2))+np.exp(-(((av-.885)/.018)**2))
   vest_col=paint(vest_col,(244,198,94),np.clip(hem_gold,0,1)*.94)
   is_vest=(v>=.50).astype(float)
   is_crown=((v>=.18)&(v<.50)).astype(float)
   cap_rgb=vis_col*(1.0-is_crown[...,None])+crown_col*is_crown[...,None]
   rgb=cap_rgb*(1.0-is_vest[...,None])+vest_col*is_vest[...,None]
   rough=np.full_like(u,.89)
 elif name=='fin':
  rays=(.5+.5*np.cos(T*u*9))**12
  if char=='bok':
   rays_b=(.5+.5*np.cos(T*u*6))**8
   rgb=mix((232,140,26),(255,224,116),.24+.58*v+.025*n)
   rgb=paint(rgb,(255,244,196),rays_b*(.34+.22*v))
   rgb=paint(rgb,(255,238,176),np.exp(-((v-.95)/.05)**2)*.46)
   rough=np.full_like(u,.88)
  elif char=='captain-bay':
   n_soft=.5*np.sin(3*T*u+7*v)+.5*np.cos(5*T*u-9*v)
   rgb=mix((102,128,168),(174,194,224),.48+.16*np.sin(math.pi*(.35+.50*v))+.012*n_soft)
   pad_m=np.clip((v-.42)/.22,0.0,1.0);pad_m=pad_m*pad_m*(3.0-2.0*pad_m)
   creases=np.zeros_like(u)
   for cu in (.20,.40,.60,.80):
    creases=np.maximum(creases,np.exp(-(((u-cu)/.026)**2)))
   ridges=np.zeros_like(u)
   for ru in (.10,.30,.50,.70,.90):
    ridges=np.maximum(ridges,np.exp(-(((u-ru)/.048)**2)))
   rgb=paint(rgb,(194,212,238),ridges*pad_m*.26*np.sin(math.pi*np.clip((v-.40)/.60,0.0,1.0)))
   rgb=paint(rgb,(46,68,108),creases*pad_m*.66*np.clip((v-.44)/.32,0.0,1.0))
   rgb=paint(rgb,(78,102,142),np.clip((v-.86)/.14,0.0,1.0)*.24)
   rough=np.full_like(u,.90)
  elif char=='echo':
   rgb=mix((232,246,236),(110,202,188),np.clip(.06+.84*(v**1.12)+.03*n,0,1))
   rgb=paint(rgb,(78,176,164),np.exp(-((v-.96)/.07)**2)*.46)
   rough=np.full_like(u,.90)
  elif char=='jisu':
   rgb=mix((232,140,70),(255,200,130),.28+.58*v+.03*n)
   rgb=paint(rgb,(224,94,52),np.exp(-((v-.48)/.095)**2)*.42)
   rgb=paint(rgb,(255,232,192),np.exp(-((v-.90)/.11)**2)*.58)
   rough=np.full_like(u,.88)
  elif char=='pip':
   rays_p=(.5+.5*np.cos(T*u*12))**10
   rgb=mix((126,48,204),(255,204,44),np.clip(.16+.82*v+.04*n,0,1))
   rgb=paint(rgb,(255,240,156),rays_p*.48)
   rgb=paint(rgb,(246,162,24),np.exp(-((v-.96)/.04)**2)*.38)
   rough=np.full_like(u,.88)
  else:
   rgb=mix((255,204,220),(255,238,232),.42+.36*np.sin(math.pi*u))
   rgb=paint(rgb,(234,206,255),np.clip((v-.32)*1.6,0,.64))
   rgb=paint(rgb,(196,252,244),np.clip((v-.62)*2.2,0,.78))
   rgb=paint(rgb,(255,248,244),rays*.28);rough=np.full_like(u,.88)
 elif name=='rim':
  if char=='bok':
   # M2 v23: Soft-tipped golden puffer-spine gradient (rich golden-honey base at v=0 -> sunlit buttery-gold soft tip at v=1!).
   tip_t=np.clip((v-.20)/.72,0,1);tip_t=tip_t*tip_t*(3.0-2.0*tip_t)
   rgb=mix((228,138,22),(255,232,142),tip_t*.88+.08)
  elif char=='captain-bay':rgb=mix((108,122,142),(156,170,190),.45+.08*n+.16*v)
  elif char=='echo':
   # M1 v21: Cozy terracotta-coral woven explorer neckerchief bandana triangle with crisp sunlit-marigold border piping & centered golden compass star.
   rgb=mix((194,62,42),(236,104,70),.48+.04*n)
   e=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))
   rgb=paint(rgb,(252,198,52),np.exp(-((e-.090)/.028)**2)*.96)
   sx,sy=u-.5,v-.46
   star=np.exp(-((np.abs(sx)/.026)**2+(np.abs(sy)/.15)**2))+np.exp(-((np.abs(sy)/.026)**2+(np.abs(sx)/.15)**2))
   ring=np.exp(-((np.hypot(sx,sy)-.19)/.022)**2)
   rgb=paint(rgb,(255,224,98),np.clip(star*.92+ring*.85,0,1))
  elif char=='jisu':
   # v39 MIN-14: Three clean zones on Jisu's coiled shell tile:
   #   v in [0.00, 0.84): Natural lagoon-teal & sunlit-sand coiled spiral whorls synced 1:1 with 3.6 3D coils
   #   v in [0.84, 0.915): Warm pearly cream-sand rolled aperture lip
   #   v in [0.915, 1.00]: Warm softly shaded cream-peach shell interior collar (replaces pure black void!)
   vs=np.clip(v/.84,0.0,1.0)
   phi=3.6*(vs**.76)+u
   wf=phi%1.0
   suture_d=np.minimum(wf,1.0-wf)
   suture_ao=np.exp(-((suture_d/.072)**2))*np.clip(vs/.10,0,1)*np.clip((.96-vs)/.10,0,1)
   t_in=np.clip((wf-.14)/.08,0,1);t_in=t_in*t_in*(3.0-2.0*t_in)
   t_out=np.clip((wf-.60)/.08,0,1);t_out=t_out*t_out*(3.0-2.0*t_out)
   teal_mask=t_in*(1.0-t_out)
   coral_pin=np.exp(-(((wf-.735)/.034)**2))*np.clip((vs-.12)/.16,0,1)
   whorl_hi=np.sin(math.pi*wf)
   sand_col=mix((236,196,132),(255,236,186),.36+.34*whorl_hi+.20*vs+.025*n)
   teal_col=mix((14,132,148),(52,198,204),.30+.44*whorl_hi+.18*vs+.025*n)
   shell_rgb=sand_col*(1.0-teal_mask[...,None])+teal_col*teal_mask[...,None]
   shell_rgb=paint(shell_rgb,(238,126,86),coral_pin*.74)
   growth=(.5+.5*np.sin(T*(vs*28.0)))**4
   shell_rgb=paint(shell_rgb,(255,246,224),growth*.07)
   shell_rgb=paint(shell_rgb,(10,76,94),suture_ao*.62)
   # Warm luminous sunlit cream-sand mother-of-pearl rolled lip
   lip_t=np.clip((v-.84)/.075,0.0,1.0)
   lip_rgb=mix((255,240,212),(255,226,196),.28+.38*np.sin(math.pi*lip_t)+.018*n)
   lip_rgb=paint(lip_rgb,(255,250,236),np.exp(-(((lip_t-.42)/.24)**2))*.68)
   # Warm softly shaded cream-peach interior shell collar (bright peach-cream near aperture -> cozy warm apricot-sand deeper inside; ZERO black void!)
   in_t=np.clip((v-.915)/.085,0.0,1.0)
   in_s=in_t*in_t*(3.0-2.0*in_t)
   in_rgb=mix((255,234,206),(208,158,132),np.clip(in_s**.90,0.0,1.0))
   in_rgb=paint(in_rgb,(255,244,224),np.exp(-((in_t/.28)**2))*.58)
   is_lip=np.clip((v-.834)/.010,0.0,1.0)
   is_in=np.clip((v-.912)/.008,0.0,1.0)
   rgb=shell_rgb*(1.0-is_lip[...,None])+lip_rgb*is_lip[...,None]
   rgb=rgb*(1.0-is_in[...,None])+in_rgb*is_in[...,None]
   rough=np.where(v>=.915,.50+.16*in_t,np.where(v>=.84,.36,.58))
  elif char=='pip':
   # m4 v20: Seafoam-mint satchel flap with warm-cream piping & embossed puzzle-piece emblem.
   rgb=mix((88,174,154),(148,220,198),.48+.04*n)
   e=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))
   rgb=paint(rgb,(248,242,216),np.exp(-((e-.075)/.026)**2)*.92)
   sx,sy=u-.5,v-.52
   mark=(np.abs(sx)<.14)&(np.abs(sy)<.14)
   mark|=((sx-.14)**2+(sy/.9)**2)<.065**2
   mark&=~(((sx+.14)**2+(sy/.9)**2)<.060**2)
   rgb=paint(rgb,(254,248,222),mark.astype(float)*.94)
  else:
   # m6 v29: Luminous crystal seafoam-aqua & pearlescent-lavender inner-lit bell rim, underside & translucent tendrils for Hana.
   rgb=mix((126,244,240),(214,190,254),.30+.38*np.sin(math.pi*v)+.14*np.cos(T*u*3.0)+.03*n)
   rgb=paint(rgb,(104,242,238),np.exp(-((v-.14)/.18)**2)*.58)
   rgb=paint(rgb,(172,255,250),np.exp(-((v-.88)/.16)**2)*.68)
  if char=='hana':rough=np.full_like(u,.92)
  elif char!='jisu':rough=np.full_like(u,.89)
 elif name=='dark':
  if char=='pip':rgb=mix((14,4,22),(28,8,38),.30+.35*v);rough=np.full_like(u,.68)
  elif char=='jisu':rgb=mix((36,26,30),(68,52,56),.20+.35*v);rough=np.full_like(u,.78)
  elif char=='bok':rgb=mix((48,26,18),(76,44,30),.28+.35*v);rough=np.full_like(u,.46)
  else:rgb=mix((22,26,44),(48,54,82),.25+.35*v);rough=np.full_like(u,.08)
 elif name=='ivory':
  if char=='hana':rgb=np.broadcast_to(np.array((255.,255.,255.)),u.shape+(3,)).copy();rough=np.full_like(u,.08)
  elif char=='echo':
   # M1 v20: Warm luminous sunlit-marigold compass/lantern medallion crystal center.
   r_c=np.hypot((u-.5)*2,(v-.5)*2)
   rgb=mix((255,252,226),(252,196,62),np.clip(r_c*.85,0,1));rough=np.full_like(u,.16)
  elif char=='jisu':
   # Warm pearl-ivory quill barrel & cream beach letter parchment.
   rgb=mix((238,226,204),(255,250,238),.42+.45*v+.03*n);rough=np.full_like(u,.70)
  else:rgb=mix((228,190,128),(255,245,216),.36+.52*v+.03*n);rough=np.full_like(u,.80)
 else:
  if char=='echo':rgb=mix((206,138,32),(255,222,94),.56+.28*v+.04*n);rough=np.full_like(u,.34);metal=np.full_like(u,.32)
  elif char=='bok':rgb=mix((190,132,36),(255,222,106),.54+.30*v+.03*n);rough=np.full_like(u,.32);metal=np.full_like(u,.40)
  elif char=='jisu':
   # Dual-zone tile: v < 0.52 = cozy warm terracotta-amber postal satchel & rear shell belt; v >= 0.52 = gleaming warm brass clasp & quill ferrule.
   is_brass=(v>=.52).astype(float)
   leather=mix((196,86,44),(236,126,68),.44+.32*(v/.52)+.04*n)
   e_l=np.minimum(v/.52,1.0-v/.52)
   leather=paint(leather,(248,202,92),np.exp(-((e_l-.12)/.04)**2)*.88)
   brass=mix((188,130,36),(252,212,92),.50+.30*((v-.52)/.48)+.03*n)
   rgb=leather*(1.0-is_brass[...,None])+brass*is_brass[...,None]
   rough=np.where(v<.52,.80,.34);metal=np.where(v<.52,0.0,.38)
  elif char=='captain-bay':rgb=mix((186,128,36),(252,214,98),.54+.30*v+.03*n);rough=np.full_like(u,.34);metal=np.full_like(u,.36)
  else:rgb=mix((158,104,36),(238,192,92),.55+.26*v+.04*n);rough=np.full_like(u,.42);metal=np.full_like(u,.28)
 return rgb,rough,metal

def hana_emissive_tile(name,u,v):
 """m6 v29: Soft inner-lit opalescent luminescence strictly on Hana's lower crystal bell skirt, radial canals & rim (0 on top crown -> ZERO hotspot!)."""
 z=np.zeros(u.shape+(3,),float)
 if name=='skin':
  a=T*u+math.pi
  cf_t=np.clip((v-.20)/.26,0,1);crown_fade=cf_t*cf_t*(3.0-2.0*cf_t)
  canal_core=((.5+.5*np.cos(a*18+.14*np.sin(7*v)))**16)*crown_fade
  # Soft inner-lit seafoam-aqua & pearlescent-lavender lower bell skirt glow (v = 0.62..1.00)
  face_keep=np.exp(-(((np.abs(u-.5))/.135)**2+((v-.76)/.12)**2))
  lav_t=np.clip((v-.52)/.24,0,1);lav_g=lav_t*lav_t*(3.0-2.0*lav_t)*np.clip((1.02-v)/.24,0,1)
  aq_t=np.clip((v-.68)/.24,0,1);aq_g=aq_t*aq_t*(3.0-2.0*aq_t)
  z+=np.asarray((192,148,255),float)*(lav_g*(.22-.10*face_keep))[...,None]
  z+=np.asarray((98,244,240),float)*(aq_g*(.46-.14*face_keep))[...,None]
  z+=np.asarray((182,252,250),float)*(canal_core*(.14+.22*v))[...,None]
 elif name=='rim':
  # Glowing crystal aquamarine scalloped rim edge & translucent bell underside
  z=mix((86,226,226),(164,174,244),.32+.28*v)*.42
 elif name=='fin':
  # Gentle glowing opalescent lavender-aqua tint along lower flowing oral-arm tips
  tip_t=np.clip((v-.42)/.50,0,1);tip_g=tip_t*tip_t*(3.0-2.0*tip_t)
  z=mix((178,158,248),(106,242,238),np.clip((v-.55)/.40,0,1))*(tip_g*.28)[...,None]
 return z

def atlas(char,out,size):
 color=np.full((size,size,3),128,np.uint8);sur=np.zeros_like(color);emis=np.zeros_like(color);f=size/1024
 for name,tile in TILES.items():
  x,y,w,h=(int(n*f) for n in tile);p=_pad(tile[2],tile[3])*f
  u,v=np.meshgrid((np.arange(w)+.5-p)/(w-2*p),(np.arange(h)+.5-p)/(h-2*p));u,v=np.clip(u,0,1),np.clip(v,0,1)
  rgb,r,m=paint_tile(char,name,u,v);color[y:y+h,x:x+w]=np.uint8(np.clip(rgb,0,255));sur[y:y+h,x:x+w,0]=255;sur[y:y+h,x:x+w,1]=np.uint8(np.clip(r*255,0,255));sur[y:y+h,x:x+w,2]=np.uint8(m*255)
  if char=='hana':emis[y:y+h,x:x+w]=np.uint8(np.clip(hana_emissive_tile(name,u,v),0,255))
 raw=out/f'color-{size}.png';jpg=out/f'color-{size}.jpg';surf=out/f'surface-{size//4}.png';png(raw,color)
 im=bpy.data.images.load(str(raw));_=im.size[:];im.file_format='JPEG';im.save(filepath=str(jpg),quality=91);bpy.data.images.remove(im)
 png(surf,np.uint8(sur.reshape(size//4,4,size//4,4,3).mean(axis=(1,3))))
 mat=bpy.data.materials.new(char+' | painted organic atlas');mat.use_nodes=True;ns=mat.node_tree.nodes;lk=mat.node_tree.links;bs=ns.get('Principled BSDF');bs.inputs['Specular IOR Level'].default_value=.05 if char=='hana' else (.06 if char=='echo' else .14)
 if 'Coat Weight' in bs.inputs: bs.inputs['Coat Weight'].default_value=0.0
 tex=ns.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(jpg));tex.image.pack();lk.new(tex.outputs['Color'],bs.inputs['Base Color'])
 tex=ns.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(surf));tex.image.colorspace_settings.name='Non-Color';tex.image.pack();sep=ns.new('ShaderNodeSeparateColor');lk.new(tex.outputs['Color'],sep.inputs[0]);lk.new(sep.outputs['Green'],bs.inputs['Roughness']);lk.new(sep.outputs['Blue'],bs.inputs['Metallic'])
 if char=='hana':
  em_path=out/f'emissive-{size//4}.png';png(em_path,np.uint8(emis.reshape(size//4,4,size//4,4,3).mean(axis=(1,3))))
  etex=ns.new('ShaderNodeTexImage');etex.image=bpy.data.images.load(str(em_path));etex.image.pack();lk.new(etex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.85
 return mat

class Mesh:
 def __init__(self):self.v=[];self.f=[];self.uv=[];self.w=[]
 def grid(self,fn,n,m,tile,bone,wrap=False,reverse=False,uvfn=None):
  off=len(self.v);cols=n if wrap else n+1
  for j in range(m+1):
   for i in range(cols):
    u,v=i/n,j/m;p=Vector(fn(u,v));self.v.append(p);self.w.append(bone(p,u,v) if callable(bone) else {bone:1})
  for j in range(m):
   for i in range(n):
    ids=(off+j*cols+i,off+j*cols+(i+1)%cols,off+(j+1)*cols+(i+1)%cols,off+(j+1)*cols+i);ts=((i/n,j/m),((i+1)/n,j/m),((i+1)/n,(j+1)/m),(i/n,(j+1)/m));us=[uv(tile,*(uvfn(*t) if uvfn else t)) for t in ts]
    self.f.append(ids[::-1] if reverse else ids);self.uv.extend(us[::-1] if reverse else us)
 def ellipsoid(self,c,scale,tile,bone,n=20,m=12,uvfn=None):
  c=Vector(c)
  self.grid(lambda u,v:c+Vector((scale[0]*math.sin(math.pi*(.001+.998*v))*math.sin(T*u),-scale[1]*math.sin(math.pi*(.001+.998*v))*math.cos(T*u),scale[2]*math.cos(math.pi*(.001+.998*v)))),n,m,tile,bone,True,True,uvfn=uvfn)
 def tube(self,fn,rad,n,m,tile,bone,flat=1,uvfn=None):
  def point(u,v):
   p=Vector(fn(v));t=(Vector(fn(min(1,v+.002)))-Vector(fn(max(0,v-.002)))).normalized();a=t.cross(Z)
   if a.length<.01:a=t.cross(Vector((1,0,0)))
   a.normalize();b=t.cross(a).normalized();r=rad(v) if callable(rad) else rad
   return p+r*(a*math.cos(T*u)+b*math.sin(T*u)*flat)
  self.grid(point,n,m,tile,bone,True,uvfn=uvfn)
 def object(self,mat,rig,char,ground=False):
  if ground:
   min_z=min(p.z for p in self.v)
   if abs(min_z)>1e-4:
    for p in self.v:p.z-=min_z
  me=bpy.data.meshes.new(char+' continuous painted surfaces');me.from_pydata(self.v,[],self.f);me.update();me.uv_layers.new(name='Atlas').data.foreach_set('uv',np.ravel(self.uv));me.polygons.foreach_set('use_smooth',[True]*len(me.polygons))
  if callable(mat):mat=mat()  # lazy: atlas is painted after the conforming eyes sampled this character's skin
  me.materials.append(mat)
  ob=bpy.data.objects.new(char,me);bpy.context.collection.objects.link(ob);ob.parent=rig;groups={b.name:ob.vertex_groups.new(name=b.name) for b in rig.data.bones}
  for i,ws in enumerate(self.w):
   for name,w in ws.items():
    if w>.0001:groups[name].add([i],w,'REPLACE')
  mod=ob.modifiers.new('Marine gesture skeleton','ARMATURE');mod.object=rig;return ob

def _bok_raw(u,v):
 # M2 v23: Charming sculpted MP8 pufferfish silhouette — plump lower cheeks, sweet smiling puffer snout cushion,
 # gently tapered crown under merchant cap, and buoyant rear taper flowing into the tail peduncle (NOT a plain sphere!).
 a=T*u;t=math.pi*(.002+.996*v);s=math.sin(t);ct=math.cos(t)
 ca,sa=math.cos(a),math.sin(a)
 front=(.5+.5*ca)**2.8;back=(.5-.5*ca)**2.0
 cheek=.095*math.exp(-((v-.48)/.18)**2)*(sa**2)
 crown_taper=-.060*math.exp(-((v-.16)/.16)**2)
 belly_flat=-.045*math.exp(-((v-.86)/.15)**2)
 width=.895*s*(1.0+cheek+crown_taper-.065*back*math.exp(-((v-.55)/.28)**2))
 snout=.082*front*math.exp(-((v-.50)/.17)**2)
 rear_ext=.125*back*math.exp(-((v-.53)/.25)**2)
 depth=.755*s*(1.0+.040*math.cos(2*a)+crown_taper*.75)
 y=-depth*ca-snout+rear_ext
 x=width*sa
 z=1.11+.865*ct+belly_flat*ct-.032*back*s
 return Vector((x,y,z))

def bok_nrm(u,v):
 e=1e-3;v0=max(.005,min(.995,v))
 pu=_bok_raw((u+e)%1.0,v0)-_bok_raw((u-e)%1.0,v0)
 pv=_bok_raw(u,min(.998,v0+e))-_bok_raw(u,max(.002,v0-e))
 n=pv.cross(pu)
 if n.length<1e-9:return Vector((0,0,1)) if v<.5 else Vector((0,0,-1))
 return n.normalized()

def bok_surface(u,v,extra=0):
 p=_bok_raw(u,v)
 return p+bok_nrm(u,v)*extra if extra else p

def bok_eye(side):
 # v32: Warm inward eye-contact convergence (~4 deg) + large sculpted living amber eyes.
 c=Vector((side*.392,-.640,1.495));n=Vector((side*.31,-.91,.22)).normalized();h=Z.cross(n).normalized();v=n.cross(h).normalized();return c,h,v,n

def smooth_w(a,b,x):
 t=max(0.,min(1.,(x-a)/(b-a)));return t*t*(3-2*t)
def _limb_w(parent_bone,child_bone,t0=.02,t1=.32):
 """Smooth gradient bone weight falloff from parent_bone at limb root (v=0) to child_bone along limb."""
 def fn(p,u,v):
  w=smooth_w(t0,t1,v);return {parent_bone:1.0-w,child_bone:w}
 return fn
def eye(mesh,side,n,m,axes=bok_eye,r=.192,surface=bok_surface,char='bok',sampler=None,res=None,depth=.21,swell=.045,lid_scale=1.0):
 # Conforming radial-disc eye with sculpted 3D upper & lower eyelid folds and un-mirrored eye_l/eye_r atlas tiles.
 # Rigging safety: v >= .75 is 100% Head/Bell, w_eye = smooth(.75,.52,v) to Eye.L/R so the eyeball moves cleanly inside the sculpted lid.
 eb='Eye.'+('L' if side<0 else 'R');root='Bell' if char=='hana' else 'Head'
 def weights(p,u,v):
  w=smooth_w(.75,.52,v);return {root:1-w,eb:w}
 CE.calibrate_skin(char,axes,r,surface,sampler or (lambda us,vs:paint_tile(char,'skin',us,vs)[0]))
 tile='eye_l' if side<0 else 'eye_r'
 return CE.conforming_eye(mesh,side,n,m,axes,r,surface,weights,depth=depth,res=res,swell=swell,tile=tile,lid_scale=lid_scale,char=char)
def bok_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 def bok_body_w(p,u,v):
  wt=smooth_w(.48,.90,p.y)*.48
  return {'Head':1.0-wt,'Tail':wt}
 b.grid(bok_surface,q(34,54),q(24,36),'skin',bok_body_w,True,True)
 for s in (-1,1):
  # M2 v23: Generously enlarged (r=0.245) 76% warm sunlit-amber conforming eyes (recessed cleanly so zero frog-eye bulge in quarter!).
  eye(b,s,q(18,30),q(12,20),bok_eye,.245,bok_surface,'bok',res=(q(34,54),q(24,36)),depth=.115,swell=.048)
  # v36 MIN 11: Plump, smoothly blended 3D sculpted muscular fin-shoulder root + gently cupped,
  # softly rounded 3D scalloped rayed pectoral fin paddle (eliminating the flat card look in bok/side.png!).
  def fin_root(u,v,s=s):
   a=T*u
   # v = 0 wide soft skin fillet nestled cleanly inside Bok's flank -> v = 1 smooth closed dome tucked INSIDE fin base (zero cuff step!)
   t_s=v*v*(3.0-2.0*v)
   flare=1.0+.58*((1.0-v)**2.2)
   tuck=math.sqrt(max(0.0,1.0-(v**3.4)))
   cx=s*(.85+.21*v)
   cy=.01+.06*t_s
   cz=1.14-.005*t_s
   ry=.082*flare*tuck
   rz=.116*flare*tuck
   return Vector((cx,cy+ry*math.cos(a),cz+rz*math.sin(a)))
  def fin_root_w(p,u,v,s=s):
   wf=smooth_w(.12,.82,v)
   return {'Head':1.0-wf,'Fin.'+('L' if s<0 else 'R'):wf}
  b.grid(fin_root,q(12,18),q(6,9),'skin',fin_root_w,True,reverse=(s<0),uvfn=lambda u,v,s=s:((.255 if s>0 else .745)+s*.028*math.cos(T*u),.495-.055*math.sin(T*u)))
  # Plump, gently spoon-cupped, softly rounded scalloped 3D rayed puffer pectoral paddle!
  def fin_mid(u,v,s=s):
   a=-1.04+2.08*u
   ca,sa=math.cos(a),math.sin(a)
   scallop=.952+.048*(abs(math.sin(u*math.pi*6.0))**.55)
   extent=v*scallop
   # Finite rounded root height (0.095) seated seamlessly inside the closed fleshy shoulder dome!
   z_root=1.14+.095*(2.0*u-1.0)
   z_fan=1.17+.275*extent*sa-.010*v
   z=z_root*(1.0-v)+z_fan*v
   # Soft semicircular rounded puffer paddle silhouette in BOTH front (±X) AND side (+Y) views with smooth mid-blade spoon cup!
   x=s*(.96+.49*extent*(.32+.68*ca))
   cup=-.056*math.sin(math.pi*u)*math.sin(math.pi*v)
   sweep_y=.03+.14*(v**1.06)+.175*extent*ca+cup
   return Vector((x,sweep_y,z))
  def fin_nrm(u,v,s=s):
   eu=1e-3;ev=1e-3
   u0,u1=max(0.0,u-eu),min(1.0,u+eu)
   v0,v1=max(0.0,v-ev),min(1.0,v+ev)
   tu=fin_mid(u1,v,s)-fin_mid(u0,v,s)
   tv=fin_mid(u,v1,s)-fin_mid(u,v0,s)
   n=(tu.cross(tv)*s)
   if n.length<1e-9:return Vector((0.0,1.0,0.0))
   return n.normalized()
  for layer in (-1,1):
   def fin_l(u,v,layer=layer,s=s):
    ray=.0055*(.5-.5*math.cos(u*T*6.0))*math.sin(math.pi*(.12+.86*v))
    # Plump fleshy thickness at root (0.068) tapering smoothly along soft cushioned rays to a rounded scalloped rim!
    rim_close=math.sqrt(max(0.0,1.0-(v**7.0)))
    edge_close=math.sin(math.pi*(.03+.94*u))**.48
    base_th=(.068*((1.0-v)**1.15)+.025*(1.0-.22*v)+ray)*rim_close*edge_close
    return fin_mid(u,v,s)+fin_nrm(u,v,s)*(layer*base_th)
   b.grid(fin_l,q(18,28),q(6,9),'fin',_limb_w('Head','Fin.'+('L' if s<0 else 'R'),.00,.20),reverse=(s*layer<0))
 # Cute miniature soft-scalloped rayed puffer dorsal fin perched behind the merchant cap on upper rear back!
 for layer in (-1,1):
  def b_dorsal(u,v,layer=layer):
   sc=.965+.035*(abs(math.sin(u*math.pi*5.0))**.55);qq=v*sc
   ray=.008*(abs(math.sin(u*math.pi*5.0))**.8)*math.sin(math.pi*v)
   th=(.022*(1.0-.48*v)+ray)*(math.sin(math.pi*(.04+.92*u))**.55)
   wave=.024*(v**1.2)*math.sin(u*math.pi)
   y=.50+.46*u+.14*qq
   z=1.64-.26*u+.03*math.sin(math.pi*u)
   h=.28*(math.sin(math.pi*(.06+.88*u))**.60)
   return Vector((wave+layer*th,y,z+qq*h))
  b.grid(b_dorsal,q(10,16),q(4,6),'fin',_limb_w('Head','Tail',.04,.44),reverse=layer<0)
 # Sculpted caudal tail peduncle (smooth Head->Tail blend so peduncle flexes organically out of rear flank!) + broad rayed tail fin!
 b.ellipsoid((0,.78,1.05),(.23,.38,.25),'skin',lambda p,u,v:{'Head':1.0-smooth_w(.48,.96,p.y),'Tail':smooth_w(.48,.96,p.y)},q(12,18),q(7,10),uvfn=lambda u,v:(.5,v))
 for layer in (-1,1):
  def tail_fan(u,v,layer=layer):
   sc=.955+.045*(abs(math.sin(u*math.pi*7.0))**.55);qq=v*sc
   ang=(u-.5)*1.75
   ray=.011*(abs(math.sin(u*math.pi*7.0))**.8)*math.sin(math.pi*v)
   th=(.034*(1.0-.45*v)+ray)*(math.sin(math.pi*v)**.55)*(math.sin(math.pi*u)**.48)
   sway=.15*(v**1.35)
   return Vector((sway+layer*th,.98+.76*qq*math.cos(ang),1.06+.64*qq*math.sin(ang)))
  b.grid(tail_fan,q(18,28),q(5,8),'fin',lambda p,u,v:{'Head':(1.0-smooth_w(.00,.18,v))*.20,'Tail':.80+.20*smooth_w(.00,.18,v)},reverse=layer>0)
 # M2 v23: Sculpted soft-tipped golden puffer-spine bumps arranged harmoniously along upper/side/rear flanks (strictly clear of face, cap & apron!).
 spine_specs=[
  # Lateral crown & mid-flank silhouette spines (clearly break up sphere silhouette in front, quarter & board views!)
  (.17,.26,.092,.054),(.83,.26,.092,.054),
  (.22,.35,.102,.058),(.78,.35,.102,.058),
  (.19,.44,.088,.052),(.81,.44,.088,.052),
  (.28,.24,.095,.055),(.72,.24,.095,.055),
  (.29,.37,.105,.058),(.71,.37,.105,.058),
  (.31,.50,.092,.054),(.69,.50,.092,.054),
  # Rear dorsal & upper back flanks behind the merchant cap
  (.37,.27,.098,.056),(.63,.27,.098,.056),
  (.38,.41,.102,.058),(.62,.41,.102,.058),
  (.37,.56,.090,.052),(.63,.56,.090,.052),
  (.44,.32,.094,.055),(.56,.32,.094,.055),
  (.45,.48,.092,.054),(.55,.48,.092,.054),
  (.50,.23,.092,.054),(.50,.38,.096,.056),
 ]
 for sp_u,sp_v,sp_len,sp_rad in spine_specs:
  p_sp=bok_surface(sp_u,sp_v,-.008);norm=bok_nrm(sp_u,sp_v)
  h_sp=Z.cross(norm)
  if h_sp.length<.05:h_sp=Vector((1,0,0)).cross(norm)
  h_sp.normalize();k_sp=norm.cross(h_sp).normalized()
  def spine_pt(u,v,p=p_sp,norm=norm,h=h_sp,k=k_sp,L=sp_len,R=sp_rad):
   ht=L*math.sin(v*math.pi*.5)
   rr=R*(math.cos(v*math.pi*.5)**.72)
   return p+norm*ht+rr*(math.cos(T*u)*h+math.sin(T*u)*k)
  b.grid(spine_pt,q(6,8),q(3,4),'rim','Head',True)
 # M2 v23: Wide, joyful upturned puffer smile seated cleanly proud below the big amber eyes & curving happily toward rosy cheeks!
 def bok_smile_pt(t):
  s=2.0*t-1.0
  uu=(s*.054)%1.0
  vv=.498-.044*(s**2)
  return bok_surface(uu,vv,.012)
 def bok_smile_r(t):
  base=.0195*(.78+.24*math.sin(math.pi*t))
  if t<.12:return base*math.sqrt(max(0.0,1.0-((.12-t)/.12)**2))
  if t>.88:return base*math.sqrt(max(0.0,1.0-((t-.88)/.12)**2))
  return base
 b.tube(bok_smile_pt,bok_smile_r,q(6,9),q(14,22),'dark','Head')
 # v28 Minor #9: Tailored teal-emerald & cream striped coastal market vest/apron cleanly BELOW the wide smile!
 def apron(u,v,extra=0):
  s=2.0*u-1.0
  a=s*1.92
  bodyv=.595+.335*v-.026*(abs(s)**2.5)*v
  eu=min(1.0,min(u,1.0-u)/.08);ev=min(1.0,min(v,1.0-v)/.08)
  dr=-.004+(.038+extra)*math.sin(min(eu,ev)*math.pi*.5)
  return bok_surface((a/T)%1,bodyv,dr)
 b.grid(apron,q(22,34),q(11,18),'cloth','Head',reverse=True,uvfn=lambda u,v:(u,.54+.42*v))
 # Solid teal-emerald market waistband encircling the waist cleanly along the top hem + tied back bow!
 b.grid(lambda u,v:bok_surface(u,.595+(v-.5)*.048,-.002+.044*math.sin(math.pi*(.14+.72*v))),q(30,48),q(3,5),'cloth','Head',True,True,uvfn=lambda u,v:(u,.525+.048*v))
 bow_p=bok_surface(.50,.595,.052)
 for s in (-1,1):
  b.ellipsoid(bow_p+Vector((s*.082,.014,.012)),(.082,.038,.050),'cloth','Head',q(8,12),q(4,6),uvfn=lambda u,v:(u,.545))
 b.ellipsoid(bow_p+Vector((0,.020,.008)),(.036,.036,.036),'cloth','Head',q(6,10),q(4,6),uvfn=lambda u,v:(u,.545))
 # Crisp sculpted 3D coastal market front pocket with gleaming hammered-brass coin button!
 b.grid(lambda u,v:apron(.30+.40*u,.18+.46*v,.020*math.sin(math.pi*u)*math.sin(math.pi*v)+.010),q(10,16),q(6,10),'cloth','Head',reverse=True,uvfn=lambda u,v:(.30+.40*u,.60+.30*v))
 badge_c=apron(.50,.42,.032)
 badge_n=bok_nrm(0.0,.73)
 badge_h=Z.cross(badge_n).normalized();badge_v=badge_n.cross(badge_h).normalized()
 def brass_badge(u,v,r_rad,thick,z_off=0.0):
  a=T*u;phi=math.pi*(.005+.990*v);sp,cp=math.sin(phi),math.cos(phi)
  return badge_c+badge_n*(z_off+thick*cp)+badge_h*(r_rad*sp*math.sin(a))+badge_v*(r_rad*sp*math.cos(a))
 # Gleaming brass merchant coin button: outer hammered-brass medallion + raised inner brass coin boss!
 b.grid(lambda u,v:brass_badge(u,v,.102,.025,0.0),q(12,18),q(5,8),'gold','Head',True,False)
 b.grid(lambda u,v:brass_badge(u,v,.056,.020,.020),q(10,16),q(4,6),'gold','Head',True,False)
 # v28 Minor #9: Seamless warm teal-emerald & cream coastal market cap seated cleanly back/high on crown!
 cap_c=Vector((0,.08,1.870))
 ca10,sa10=math.cos(math.radians(-10)),math.sin(math.radians(-10))
 cap_up=Vector((0,-sa10,ca10)).normalized()
 cap_fwd=Vector((0,-ca10,-sa10)).normalized()
 cap_r=Vector((1,0,0))
 def cap_crown(u,v):
  a=T*u+math.pi  # seam strictly at back +Y!
  if v<.78:
   t=v/.78;phi=(.005+.995*t)*math.pi*.5
   puff=1.0+.14*math.sin(t*math.pi*.75)+.028*abs(math.cos(3.0*a))*math.sin(phi)
   rx=.508*puff*math.sin(phi);ry=.458*puff*math.sin(phi);h=.280*math.cos(phi)
  else:
   t=(v-.78)/.22
   rx=.508-.034*t;ry=.458-.032*t;h=-.074*t
  return cap_c+cap_r*(rx*math.sin(a))+cap_fwd*(ry*math.cos(a))+cap_up*h
 b.grid(cap_crown,q(22,38),q(9,15),'cloth','Head',True,True,uvfn=lambda u,v:(u,.20+.26*min(1.0,v/.80)))
 # Solid 3D double-sided curved warm-cream coastal market visor with teal-emerald brim piping!
 def cap_visor_3d(u,v,layer):
  ang=(u-.5)*math.pi*.86;ca,sa=math.cos(ang),math.sin(ang);taper=math.sin(math.pi*u)**.88
  r_out=.285*v*taper
  x=.488*sa+.035*sa*v
  y_f=.440*ca+r_out
  z_mid=.005-.038*v*taper-.022*(1.0-ca)
  half_th=.016*(math.sin(math.pi*v)**.55)*(taper**.45)
  return cap_c+cap_r*x+cap_fwd*y_f+cap_up*(z_mid+layer*half_th)
 for layer in (-1,1):
  b.grid(lambda u,v,layer=layer:cap_visor_3d(u,v,layer),q(16,28),q(4,6),'cloth','Head',reverse=layer>0,uvfn=lambda u,v:(u,.03+.125*v))
 # Gleaming brass crown top button + prominent brass merchant emblem seated proudly on the cap front brow!
 b.ellipsoid(cap_c+cap_up*.284,(.060,.054,.025),'gold','Head',q(8,12),q(4,6))
 def cap_emblem(u,v):
  a=T*u;phi=math.pi*(.005+.990*v);sp,cp=math.sin(phi),math.cos(phi)
  return cap_c+cap_fwd*(.525+.024*sp*math.cos(a))+cap_r*(.066*sp*math.sin(a))+cap_up*(.078+.050*cp)
 b.grid(cap_emblem,q(10,14),q(5,8),'gold','Head',True,True)
 return b.object(mat,rig,'Bok')

def hana_bell(u,v):
 # M6 v21 + C1 v24: Place UV/vertex meridian strictly at back +Y (a = T*u + pi -> front forehead sits at continuous u=0.5, ZERO seam),
 # pure C-infinity smooth polar dome curvature (zero exponential apex kink!) and closed welded apex for exact (0,0,1) normal.
 a=T*u+math.pi;theta=v*math.pi/2;r=math.sin(theta);scallop=(.5+.5*math.cos(a*18))
 return Vector((.99*r*math.sin(a),-.83*r*math.cos(a),1.63+.69*math.cos(theta)+.044*v**8*scallop))
def hana_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 # C1 v24: Welded single apex vertex at v=0 with clean outward triangle cap -> exact (0,0,1) smooth normal, zero pinhole/pole hotspot.
 nb,mb=q(44,68),q(14,22)
 apex=len(b.v);b.v.append(hana_bell(0,0));b.w.append({'Bell':1})
 ring_off=len(b.v)
 for j in range(1,mb+1):
  for i in range(nb):
   b.v.append(hana_bell(i/nb,j/mb));b.w.append({'Bell':1})
 for i in range(nb):
  i1=(i+1)%nb
  b.f.append((ring_off+i,ring_off+i1,apex))
  b.uv.extend([uv('skin',i/nb,1/mb),uv('skin',(i+1)/nb,1/mb),uv('skin',.5,.015)])
 for j in range(mb-1):
  for i in range(nb):
   i1=(i+1)%nb
   r0=ring_off+j*nb;r1=ring_off+(j+1)*nb
   ids=(r0+i,r0+i1,r1+i1,r1+i)
   ts=((i/nb,(j+1)/mb),((i+1)/nb,(j+1)/mb),((i+1)/nb,(j+2)/mb),(i/nb,(j+2)/mb))
   b.f.append(ids[::-1]);b.uv.extend([uv('skin',*t) for t in ts[::-1]])
 # One opaque sculpted underside with seam strictly at back +Y; no transparency stack.
 b.grid(lambda u,v:Vector((.99*(1-v)*math.sin(T*u+math.pi),-.83*(1-v)*math.cos(T*u+math.pi),1.63+.044*math.cos((T*u+math.pi)*18)**2-.095*math.sin(math.pi*v))),q(44,68),q(4,7),'rim','Bell',True,True)
 b.tube(lambda t:hana_bell(t,1),.026,q(6,8),q(64,100),'rim','Bell')
 # Four smooth, silky pastel oral arms forming broad flowing tissue ribbons (outward normals, zero self-intersection).
 for i in range(4):
  a=T*i/4+.38;bone='Oral.'+str(i)
  def oral(u,v,a=a):
   t=v;center=Vector((math.sin(a)*(.22+.36*t)+.11*math.sin(t*4.0+a)*t,-math.cos(a)*(.22+.36*t)+.10*math.cos(t*3.6+a)*t,1.60-1.18*t))
   h=Vector((math.cos(a),math.sin(a),0));n=Vector((math.sin(a),-math.cos(a),0));w=(.14+.09*math.sin(math.pi*t))*(1-.60*t**3)*(1+.07*math.sin(t*9.0))
   ripple=.032*math.sin(math.pi*u)*math.sin((u*.90+t*1.5)*T)
   return center+h*((2*u-1)*w)+n*ripple
  for layer in (-1,1):b.grid(lambda u,v,layer=layer:oral(u,v)+Vector((math.sin(a),-math.cos(a),0))*(layer*.015*(math.sin(math.pi*u)**.60)*(1-.72*v**2.4)),q(7,12),q(15,28),'fin',_limb_w('Bell',bone,.02,.30),reverse=layer>0)
 # Fine independent trailing perimeter tentacles with twist-free horizontal-reference frames & smooth Bell->Fringe root blend!
 for i in range(14):
  a=T*i/14+.08;length=.88+.30*(.5+.5*math.sin(i*2.7));bone='Fringe.'+str(i%4)
  ref=Vector((math.sin(a),-math.cos(a),0))
  def tend(v,a=a,length=length,i=i):return Vector((.90*math.sin(a)+.18*math.sin(v*4.1+i)*v,-.75*math.cos(a)+.14*math.sin(v*5+i*.7)*v,1.64-length*v))
  def tend_pt(u,v,tend=tend,ref=ref):
   p=tend(v);t=(tend(min(1,v+.002))-tend(max(0,v-.002))).normalized()
   ax=(ref-t*ref.dot(t)).normalized();bx=t.cross(ax).normalized()
   r=.022*(1-.70*v)
   if v>.92:
    k=(v-.92)/.08;r*=math.sqrt(max(.0,1-k*k))
   return p+r*(ax*math.cos(T*u)+bx*math.sin(T*u))
  b.grid(tend_pt,q(5,7),q(15,28),'rim',_limb_w('Bell',bone,.02,.26),True)
 # M6 v21: Enlarged (~23% larger, r=0.178) luminous amethyst-violet 76%-iris conforming eyes pitched gently upward for warm 07-lighthouse board readability.
 hana_sampler=lambda us,vs:paint_tile('hana','skin',us,np.maximum(.015,vs))[0]
 def hana_eye(side):
  c=Vector((side*.292,-.732,1.892));n=Vector((side*.22,-.97,.14)).normalized();h=Z.cross(n).normalized();z=n.cross(h).normalized()
  return c,h,z,n
 for s in (-1,1):
  c,h,z,n=hana_eye(s)
  eye(b,s,q(18,30),q(12,20),hana_eye,.178,hana_bell,'hana',sampler=hana_sampler,res=(q(44,68),q(14,22)),depth=.135,swell=.048)
  # Expressive soft arched rose-plum brow cleanly above the enlarged eye.
  def brow(t,c=c,h=h,z=z,n=n,s=s):
   u=2*t-1
   return c+h*(s*.090*u)+z*(.210+.026*math.sin(math.pi*t))+n*(.004-.024*u*u)
  b.tube(brow,lambda t:.017*(.65+.35*math.sin(math.pi*t)),q(6,8),q(10,12),'cloth','Bell')
 b.tube(lambda t:Vector((-.095+.190*t,-.818+.026*(2*t-1)**2,1.758-.022*math.sin(t*math.pi))),lambda t:.014*(math.sin(math.pi*(.10+.80*t))**.55),6,12,'cloth','Bell')
 return b.object(mat,rig,'Keeper Hana')

# v26 Minor #8: Heroic Pixar/MP8 sea-captain walrus body profile (distinct pinniped head -> pinched neck ->
# broad muscular sea-captain shoulders -> proud barrel chest -> flat grounded belly resting solidly on Z = 0.00!).
# Stations: (z, y_center, rx, ry_front, ry_back)
CAPTAIN_PROFILE=[
 (2.145,-.21,.000,.000,.000), # 0: crown apex (under peaked naval cap, headroom for ~1.30x enlarged eyes & brows)
 (2.085,-.21,.360,.335,.315), # 1: smooth rounded upper walrus brow
 (1.880,-.24,.468,.442,.405), # 2: distinct sculpted walrus skull & enlarged eye shelf
 (1.620,-.25,.480,.444,.375), # 3: full friendly walrus cheeks/jaw (gently rounded nape!)
 (1.430,-.16,.365,.335,.325), # 4: DEFINED PINCHED PINNIPED NECK (breaks egg silhouette!)
 (1.25,-.05,.725,.565,.510),  # 5: BROAD HEROIC SEA-CAPTAIN SHOULDERS (epaulet shelf!)
 (0.95,-.02,.780,.645,.585),  # 6: proud muscular barrel chest
 (0.62, .05,.730,.615,.640),  # 7: sturdy sea-captain waist/hips
 (0.26, .11,.625,.535,.615),  # 8: lower grounded haunches
 (0.05, .09,.415,.375,.435),  # 9: flat deck-contact belly cushion
 (0.00, .07,.000,.000,.000),  # 10: grounded belly pole at Z = 0.00
]

def _cap_curve(pts,t):
 q=max(0.0,min(len(pts)-1.000001,t));i=int(q);u=q-i
 a,b,c,d=(pts[max(0,i-1)],pts[i],pts[i+1],pts[min(i+2,len(pts)-1)])
 return tuple(b0+.5*u*((c0-a0)+u*((2*a0-5*b0+4*c0-d0)+u*(3*b0-3*c0+d0-a0))) for a0,b0,c0,d0 in zip(a,b,c,d))

def _captain_raw(u,v):
 a=T*u;ca,sa=math.cos(a),math.sin(a)
 if v<.065:
  t=.004+.996*(v/.065);vs=.065;sc=math.sin(t*math.pi*.5);z_cap=.048*math.cos(t*math.pi*.5)
 elif v>.940:
  t=.004+.996*((1.0-v)/.060);vs=.940;sc=math.sin(t*math.pi*.5);z_cap=-.042*math.cos(t*math.pi*.5)
 else:
  vs=v;sc=1.0;z_cap=0.0
 z,yc,rx,ryf,ryb=_cap_curve(CAPTAIN_PROFILE,vs*(len(CAPTAIN_PROFILE)-1))
 rx=max(0.0,rx)*sc;ryf=max(0.0,ryf)*sc;ryb=max(0.0,ryb)*sc
 # Gentle heroic shoulder squareness & subtle forward chest puff (authentic sea-captain posture, never a bowling-ball egg!)
 sh_sq=1.0+.045*(sa**2)*math.exp(-((vs-.52)/.12)**2)
 ry=ryf*(.5+.5*ca)+ryb*(.5-.5*ca)
 return Vector((rx*sh_sq*sa,yc-ry*ca,max(0.0,z+z_cap)))

def captain_nrm(u,v):
 e=1e-3;v0=max(.005,min(.995,v))
 pu=_captain_raw((u+e)%1.0,v0)-_captain_raw((u-e)%1.0,v0)
 pv=_captain_raw(u,min(.998,v0+e))-_captain_raw(u,max(.002,v0-e))
 n=pv.cross(pu)
 if n.length<1e-9:return Vector((0,0,1)) if v<.5 else Vector((0,0,-1))
 return n.normalized()

def captain_surface(u,v,extra=0):
 p=_captain_raw(u,v)
 return p+captain_nrm(u,v)*extra if extra else p

def captain_eye(side):
 # v32: Enlarged (~1.30x) warm living sky-blue eyes with ~4 deg inward eye-contact convergence!
 c=Vector((side*.266,-.575,1.872));n=Vector((side*.27,-.94,.18)).normalized();h=Z.cross(n).normalized();v=n.cross(h).normalized();return c,h,v,n

def captain_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 def captain_body_w(p,u,v):
  # Smooth gradient falloff: grounded belly cushion stays anchored to Root (Z=0), torso breathes & sways,
  # and defined pinched walrus neck (z in [1.26, 1.56]) smoothly transitions Torso -> Head (zero snowman cut!).
  if p.z<.32:
   wt=smooth_w(.06,.30,p.z)
   return {'Root':1.0-wt,'Torso':wt}
  wh=smooth_w(1.26,1.56,p.z)
  return {'Torso':1.0-wh,'Head':wh}
 b.grid(captain_surface,q(24,38),q(18,28),'skin',captain_body_w,True,True)

 # --- 1. FACE, EYES, BROW TUFTS, WHISKER PADS, TUSKS & WHISKERS (v30 Minor #2: ~1.30x larger expressive eyes + proportional sockets & brows!) ---
 for s,suf in ((-1,'L'),(1,'R')):
  eye(b,s,q(16,24),q(10,18),captain_eye,.204,captain_surface,'captain-bay',res=(q(24,38),q(18,28)),depth=.135,swell=.050)
  # Proportionally scaled arched ivory brow tufts tucked snugly over the enlarged upper eye ridge cleanly below the cap visor!
  def bay_brow(t,s=s):
   ub=(s*(.062+.072*t))%1.0
   vb=.116-.011*math.sin(math.pi*t)
   return captain_surface(ub,vb,.014)
  b.tube(bay_brow,lambda t:.019*(.64+.36*math.sin(math.pi*t)),q(5,8),q(6,10),'ivory','Head',flat=.65)
  # Lush sculpted cream walrus mystacial whisker pads!
  def muzzle(u,v,s=s):
   t=math.pi*(.002+.996*v);a=T*u
   return Vector((s*.184+.248*math.sin(t)*math.sin(a),-.575-.218*math.sin(t)*math.cos(a),1.542+.180*math.cos(t)+.028*math.sin(a)))
  b.grid(muzzle,q(12,20),q(7,12),'ivory','Head',True,True)
  # Friendly slightly curved rounded-tip ivory tusks framing the cream chest cleanly INSIDE the open coat lapels!
  def tusk_pt(t,s=s):
   return Vector((s*(.258+.036*math.sin(t*math.pi)-.028*t),-.625-.145*t+.042*math.sin(t*math.pi),1.485-.645*t))
  def tusk_rad(t):
   base=.074*(1.0-.64*(t**1.35))+.014*(1.0-(t**6))
   if t>.90:
    k=(t-.90)/.10;return base*math.sqrt(max(0.0,1.0-k*k))
   return base
  b.tube(tusk_pt,tusk_rad,q(8,12),q(9,14),'ivory','Head')
  # Crisp tapered natural vibrissae fanning cleanly out from whisker pads.
  for i in range(q(5,9)):
   zw=1.47+(i%4)*.052;root=Vector((s*(.21+.038*(i%3)),-.755+(.012*(i%3)),zw));length=.28+.038*(i%4)
   b.tube(lambda t,s=s,root=root,length=length,i=i:root+Vector((s*length*t,-.13*t+.07*t*t,-(.035+.035*(i%3))*t-.08*t*t)),lambda t:.0062*(1-.92*t),q(3,4),q(4,7),'ivory','Head')
 # Broad slate-blue walrus nostril pad with two dark natural nostrils (clean breathing room below enlarged eyes).
 b.ellipsoid((0,-.675,1.706),(.130,.090,.086),'rim','Head',q(14,22),q(7,12))
 for s in (-1,1):b.ellipsoid((s*.052,-.754,1.702),(.026,.012,.027),'dark','Head',q(7,12),q(4,7))

 # --- 2. v27 Minor #3: BROAD SCULPTED FLATTENED WALRUS PADDLE FORE-FLIPPERS WITH NARROWED WRIST & 5 SCALLOPED 3D DIGITS ON Z = 0.00! ---
 for s,suf in ((-1,'L'),(1,'R')):
  # Defined forearm -> NARROWED wrist -> broad flattened paddle palm (>2.4x wrist width!) -> 5 distinct 3D scalloped digit lobes & recessed creases!
  ff_pts=[
   (s*.62,-.02,.94,.185,.180),    # 0: muscular shoulder inside tailored navy sleeve
   (s*.80,-.15,.56,.158,.140),    # 1: tapered forearm below gold cuff
   (s*.91,-.28,.17,.122,.092),    # 2: DEFINED NARROWED WRIST planting onto deck
   (s*1.08,-.49,.054,.272,.054),  # 3: broad flattened walrus palm flaring sharply out from wrist
   (s*1.23,-.73,.042,.332,.042),  # 4: broad sculpted flattened paddle blade bracing flat on Z=0
   (s*1.31,-.85,.018,.302,.000),  # 5: wide front 5-digit scalloped margin closing watertight top-to-bottom on Z=0!
  ]
  def ff_center(vs,pts=ff_pts):
   x,y,z,hw,ht=_cap_curve(pts,vs*(len(pts)-1))
   return Vector((x,y,z)),max(0.0,hw),max(0.0,ht)
  def fore_flipper(u,v,s=s,pts=ff_pts):
   # Exact linear t_lat across top (u in [0..0.5]) & identical mirrored bottom (u in [0.5..1]) so n_u=40/60 hits EVERY
   # one of the 5 digit peaks (0.1,0.3,0.5,0.7,0.9) and 4 inter-digit valleys (0.2,0.4,0.6,0.8) on exact vertices,
   # and closes 100% watertight vertex-for-vertex along the wide scalloped 5-digit front margin at v = 1!
   is_top=(u<=.5)
   t_lat=(1.0-2.0*u) if is_top else (2.0*u-1.0)
   a=T*u;ca_cyl,sa_cyl=math.cos(a),math.sin(a)
   vs=.62*v+.38*math.sin(v*math.pi*.5)
   c,hw,ht=ff_center(vs,pts)
   t_sp=(ff_center(min(1.0,vs+.004),pts)[0]-ff_center(max(0.0,vs-.004),pts)[0]).normalized()
   lat=Z.cross(t_sp)
   if lat.length<.05:lat=Vector((s,0,0))
   lat.normalize()
   if lat.x*s<0:lat=-lat
   up=t_sp.cross(lat).normalized()
   if up.z<0:up=-up
   pad_k=smooth_w(.34,.56,vs)
   # Blend cross-section smoothly from circular arm (pad_k=0) to broad flat paddle blade (pad_k=1) with linear 5-digit spacing!
   x_lin=2.0*t_lat-1.0
   x_lat=ca_cyl*(1.0-pad_k)+x_lin*pad_k
   edge_env=math.sin(math.pi*t_lat)**.55
   z_sec=sa_cyl*(1.0-pad_k)+((edge_env if is_top else -edge_env))*pad_k
   # 5 clearly-sculpted 3D scalloped digit lobes (peaks at 0.1, 0.3, 0.5, 0.7, 0.9) & 4 recessed inter-digit creases (0.2, 0.4, 0.6, 0.8)!
   digit_wave=.5-.5*math.cos(10.0*math.pi*t_lat)
   lobe=digit_wave**.68
   # Graceful arched front fan contour + bold forward-protruding 3D scalloped digit tips & recessed web notches along t_sp!
   fan_arch=.115*(math.sin(math.pi*t_lat)**.62)*smooth_w(.52,.98,vs)
   digit_tip_fwd=(.092*lobe-.026*(1.0-lobe))*smooth_w(.56,.96,vs)*(math.sin(math.pi*t_lat)**.28)
   # Pronounced 3D dorsal digit ridges (+0.030) and recessed inter-digit valleys (-0.015) along the flattened paddle!
   ridge_env=math.sin(math.pi*min(1.0,max(0.0,(vs-.36)/.64)))**.55
   digit_z=(.030*lobe-.015*(1.0-lobe))*pad_k*ridge_env if is_top else 0.0
   # Smooth thickness taper to exact 0 along the front scalloped margin (v -> 1) so top & bottom meet cleanly watertight!
   tip_th_t=math.sqrt(max(0.0,1.0-max(0.0,(vs-.72)/.28)**2))
   ht_eff=ht*(1.0-pad_k)+max(ht,.042*tip_th_t)*pad_k
   if vs>.995:ht_eff=0.0;digit_z=0.0
   camber=.018*math.sin(math.pi*t_lat)*pad_k*tip_th_t
   p=c+t_sp*(fan_arch+digit_tip_fwd)+lat*(hw*x_lat)+up*(camber+ht_eff*z_sec+digit_z)
   # Keep grounded flat sole cleanly on deck plane Z = 0.00 (glTF_minY = 0.000, zero sinking, zero floating!)
   if pad_k>.01:
    p.z=p.z+(max(0.0,p.z)-p.z)*pad_k
   return p
  def ff_w(p,u,v,suf=suf):
   w_f=smooth_w(.04,.26,v)
   return {'Torso':1.0-w_f,'Fin.'+suf:w_f}
  b.grid(fore_flipper,q(40,60),q(9,13),'fin',ff_w,True,reverse=(s<0),uvfn=lambda u,v:(1.0-2.0*u if u<=.5 else 2.0*u-1.0,v))

 # --- 3. SCULPTED TAPERED PINNIPED HIND BODY & BROAD FANNED TWIN HIND TAIL FLIPPERS ON Z = 0.00! ---
 hind_pts=[
  (.08,.44,.64,.45,.44),  # 0: seated seamlessly inside broad lower torso under flared navy coattails
  (.42,.38,.56,.40,.38),  # 1: muscular upper walrus hips
  (.80,.29,.43,.31,.29),  # 2: sleek tapered mid hind-body
  (1.14,.20,.30,.21,.20), # 3: tapered pinniped tailstock/pelvis
  (1.40,.13,.19,.14,.13), # 4: ankle base of fanned hind flippers
  (1.52,.08,.00,.00,.00), # 5: closed rear end inside hind flipper bridge
 ]
 def hind_surf(u,v):
  a=T*u;ca,sa=math.cos(a),math.sin(a)
  if v>.92:
   t=(1.0-v)/.08;vs=.92;sc=math.sin(t*math.pi*.5);y_off=.08*math.cos(t*math.pi*.5)
  else:
   vs=v;sc=1.0;y_off=0.0
  y,zc,rx,rzt,rzb=_cap_curve(hind_pts,vs*(len(hind_pts)-1))
  rx=max(0.0,rx)*sc;rzt=max(0.0,rzt)*sc;rzb=max(0.0,rzb)*sc
  rz=rzt*(.5+.5*ca)+rzb*(.5-.5*ca)
  return Vector((rx*sa,y+y_off,max(0.0,zc+rz*ca)))
 def hind_w(p,u,v):
  wt=smooth_w(.36,.72,v);return {'Torso':1.0-wt,'Tail':wt}
 b.grid(hind_surf,q(12,20),q(8,12),'skin',hind_w,True,False,uvfn=lambda u,v:(.22+.24*abs(2*u-1),.55+.36*v))

 # Broad sculpted fanned twin hind tail flippers splayed symmetrically on the deck (Z = 0.00) with subtle digit ridges!
 for s in (-1,1):
  ang_h=s*math.radians(36.0)
  fwd_h=Vector((math.sin(ang_h),math.cos(ang_h),0.0))
  lat_h=Vector((math.cos(ang_h),-math.sin(ang_h),0.0))*s
  root_h=Vector((s*.11,1.30,.085))
  def hind_flipper(u,v,fwd_h=fwd_h,lat_h=lat_h,root_h=root_h):
   a=T*u;ca,sa=math.cos(a),math.sin(a)
   vs=.54*v+.46*math.sin(v*math.pi*.5)
   tip_arc=math.sqrt(max(0.0,1.0-max(0.0,(vs-.68)/.32)**2))
   t_lat=.5*(1.0+ca)
   scallop=1.0+.044*math.cos(5.0*math.pi*t_lat)*smooth_w(.55,.88,vs)*(1.0-smooth_w(.94,1.0,vs))
   hw=(.120+.148*(vs**.80))*tip_arc*scallop
   ht=(.084*(1.0-.42*vs))*math.sqrt(max(0.0,1.0-max(0.0,(vs-.60)/.40)**2))
   ridge=.015*(.5+.5*math.cos(5.0*math.pi*t_lat))*math.sin(math.pi*vs)
   c=root_h+fwd_h*(.72*vs)+Vector((0,0,-.038*vs))
   p=c+lat_h*(hw*ca)+Z*(ht*sa+(ridge if sa>0 else 0.0))
   p.z=max(0.0,p.z)
   return p
  b.grid(hind_flipper,q(10,18),q(7,12),'skin','Tail',True,reverse=(s<0),uvfn=lambda u,v:(.28+.18*abs(2*u-1),.62+.28*v))

 # --- 4. TAILORED NAVY SEA-CAPTAIN'S COAT WITH FLARED HEM, STANDING COLLAR, LAPELS, SLEEVES, CUFFS & GOLD EPAULETS! ---
 def cap_coat(u,v,extra_dr=0.0):
  # Wraps cleanly over broad shoulders & upper back (u in [0.095..0.905]), flaring heroically outward at the lower hem!
  ub=.095+.810*u
  vb=.415+.405*v
  ev=min(1.0,min(v,1.0-v)/.07)
  # Tailored flared coat skirt: flares proudly outward over hips & back coattails instead of hugging an egg!
  a=T*ub;back_tail=.5-.5*math.cos(a)
  flare=(.115+.065*back_tail)*(max(0.0,(v-.36)/.64)**1.45)
  dr=-.004+(.034+.006*math.sin(math.pi*v)+extra_dr)*math.sin(ev*math.pi*.5)
  p=captain_surface(ub,vb,dr)
  p+=Vector((math.sin(a)*flare,-math.cos(a)*flare,.048*back_tail*(max(0.0,(v-.40)/.60)**1.4)))
  return p
 b.grid(cap_coat,q(18,32),q(8,14),'cloth',captain_body_w,False,True,uvfn=lambda u,v:(u,.06+.88*v))
 # Solid front vertical coat returns + lower hem return (crisp thick tailored wool edges, ZERO jagged seam!)
 for su_c,rev in ((0.0,False),(1.0,True)):
  b.grid(lambda u,v,su_c=su_c:cap_coat(su_c,v,-.040*(1.0-u)),2,q(8,14),'cloth',captain_body_w,False,rev,uvfn=lambda u,v:(.50,.40))
 # Sculpted 3D braided gold piping trim hugging the entire flared lower hem of the captain's coat!
 def hem_gold(u,v):
  p=cap_coat(u,.925,.006)
  ub=.095+.810*u;a=T*ub
  n_out=Vector((math.sin(a),-math.cos(a),0.0)).normalized()
  ca,sa=math.cos(T*v),math.sin(T*v)
  return p+n_out*(.018*ca)+Z*(.018*sa)
 b.grid(hem_gold,q(18,30),q(4,6),'gold',captain_body_w,False,False)

 # Structured standing naval collar encircling the defined pinched neck (smoothly weighted with Torso<->Head!)
 def cap_collar(u,v):
  ev=min(1.0,min(v,1.0-v)/.18)
  dr=-.004+(.042+.010*math.sin(math.pi*v))*math.sin(ev*math.pi*.5)
  return captain_surface(.080+.840*u,.365+.072*v,dr)
 b.grid(cap_collar,q(18,30),q(4,7),'cloth',captain_body_w,False,True,uvfn=lambda u,v:(u,.30+.22*v))
 for su,rev in ((.080,False),(.920,True)):
  b.grid(lambda u,v,su=su:captain_surface(su,.365+.072*v,-.006+u*.046),2,q(4,7),'cloth',captain_body_w,False,rev,uvfn=lambda u,v:(.50,.40))

 # Crisp tailored 3D folded naval V-lapels framing the upper open chest cleanly ABOVE the brass buttons!
 for s in (-1,1):
  def lapel_3d(u,v,s=s):
   # Clean triangular naval lapel fold: widest crisp lapel peak at v=0.45, tapering cleanly to collar & chest!
   vb=.415+.165*v
   tri=math.sin(math.pi*(v**.82))**.72
   ub_in=.095 if s>0 else .905
   du=s*(.068*tri)*u
   ub=(ub_in+du)%1.0
   edge_s=math.sin(math.pi*min(1.0,max(0.0,.08+.84*u)))**.38
   dr=.042+.024*edge_s*math.sin(math.pi*(.10+.80*v))
   return captain_surface(ub,vb,dr)
  b.grid(lapel_3d,q(6,10),q(6,10),'cloth',captain_body_w,False,reverse=(s>0),uvfn=lambda u,v:(.50,.18+.32*v))
  # Crisp slim gold piping bead tracing the clean outer lapel peak
  b.tube(lambda t,s=s:lapel_3d(1.0,t,s),lambda t:.0088*(.78+.22*math.sin(math.pi*t)),q(4,6),q(6,10),'gold',captain_body_w)

 # Tailored navy captain's coat sleeves + twin gleaming 3D gold captain rank cuff rings (smoothly Torso->Fin weighted so waving Fin.R moves the sleeve & cuffs!)
 for s,suf in ((-1,'L'),(1,'R')):
  sl_p0=Vector((s*.58,-.01,.98));sl_p1=Vector((s*.81,-.16,.60))
  sl_ax=(sl_p1-sl_p0).normalized()
  sl_u=Z.cross(sl_ax).normalized();sl_v=sl_ax.cross(sl_u).normalized()
  def sleeve_surf(u,v,sl_p0=sl_p0,sl_p1=sl_p1,sl_u=sl_u,sl_v=sl_v):
   a=T*u;c=sl_p0.lerp(sl_p1,v)
   r=(.260-.052*v)*(.92+.08*math.sin(math.pi*v))
   if v>.90:
    k=(v-.90)/.10;r-=.022*k
   return c+sl_u*(r*math.cos(a))+sl_v*(r*math.sin(a))
  b.grid(sleeve_surf,q(12,20),q(5,9),'cloth',_limb_w('Torso','Fin.'+suf,.14,.84),True,False,uvfn=lambda u,v:(u,.25+.42*v))
  # Twin gleaming 3D gold captain rank braid bands around each sleeve cuff!
  for tc in (.74,.87):
   cc=sl_p0.lerp(sl_p1,tc);rc=.260-.052*tc+.005
   wf_c=smooth_w(.14,.84,tc)
   def cuff_ring(u,v,cc=cc,rc=rc,sl_u=sl_u,sl_v=sl_v,sl_ax=sl_ax):
    a=T*u;b_a=T*v
    rad_out=rc+.013*math.cos(b_a)
    return cc+sl_ax*(.013*math.sin(b_a))+sl_u*(rad_out*math.cos(a))+sl_v*(rad_out*math.sin(a))
   b.grid(cuff_ring,q(10,18),q(3,6),'gold',lambda p,u,v,wf=wf_c,suf=suf:{'Torso':1.0-wf,'Fin.'+suf:wf},True,False)

 # HEROIC SCULPTED 3D GOLD-FRINGED SEA-CAPTAIN EPAULETS seated 100% FLUSH ON TOP of the broad coat shoulders (zero air gap!)
 for s in (-1,1):
  u_sh=.26 if s>0 else .74
  ep_p0=cap_coat((u_sh-.095)/.810,.03,.010)
  ep_p1=cap_coat((u_sh-.095)/.810,.25,.012)
  ep_dir=(ep_p1-ep_p0).normalized()
  ep_fwd=Vector((0.0,-1.0,0.0))
  ep_up=ep_fwd.cross(ep_dir).normalized()
  if ep_up.z<0:ep_up=-ep_up
  def ep_board(u,v,ep_p0=ep_p0,ep_p1=ep_p1,ep_fwd=ep_fwd,ep_up=ep_up):
   a=T*u;c=ep_p0.lerp(ep_p1,v)+ep_up*(.020*math.sin(math.pi*v)+.006)
   hw=(.084+.036*v)*math.sqrt(max(0.0,1.0-(2.0*v-1.0)**8))
   ht=.024*math.sqrt(max(0.0,1.0-(2.0*v-1.0)**8))
   return c+ep_fwd*(hw*math.cos(a))+ep_up*(ht*math.sin(a))
  b.grid(ep_board,q(10,16),q(5,9),'gold',captain_body_w,True,reverse=(s<0))
  # Lush sculpted 3D gold bullion crescent fringe bolster hugging snugly over the outer shoulder cap!
  def ep_fringe(u,v,ep_p1=ep_p1,ep_fwd=ep_fwd,ep_up=ep_up,ep_dir=ep_dir):
   ang=(v-.5)*math.pi*1.12
   c_ring=ep_p1+ep_fwd*(.122*math.sin(ang))+ep_dir*(.036*math.cos(ang))+ep_up*(-.014+.008*math.cos(ang))
   a=T*u
   tassel=1.0+.15*math.cos(10.0*ang)
   r_f=.048*tassel*math.sqrt(max(0.0,1.0-((2.0*v-1.0)**4)))
   return c_ring+ep_dir*(r_f*math.cos(a))+ep_up*(r_f*1.14*math.sin(a))+ep_fwd*(r_f*.35*math.sin(ang)*math.cos(a))
  b.grid(ep_fringe,q(6,12),q(8,14),'gold',captain_body_w,True,reverse=(s<0))
  # Gleaming inner epaulet button seated flush on strap
  b.ellipsoid(ep_p0+ep_dir*.050+ep_up*.026,(.028,.028,.018),'gold',captain_body_w,q(6,10),q(3,5))

 # Double-breasted gleaming brass sea-captain coat buttons seated PROUDLY on the actual flared coat surface (2 columns x 3 buttons)!
 for vc_btn in (.48,.66,.83):
  for uc_btn in (.048,.952):
   bp=cap_coat(uc_btn,vc_btn,.026)
   b.ellipsoid(bp,(.046,.034,.046),'gold',captain_body_w,q(6,12),q(3,6))

 # --- 5. JAUNTY NAVAL PEAKED CAPTAIN'S CAP seated cleanly ABOVE scaled brows & enlarged eyes (zero visor eye shadow in board view!) ---
 cap_c=Vector((0,-.19,2.132))
 # Peaked naval cap crown flaring gently upward into a crisp nautical top (zero saucer air gap!)
 def naval_crown(u,v):
  a=T*u+math.pi
  phi=(.002+.998*v)*math.pi*.5
  flare=1.0+.22*math.sin((1.0-v)*math.pi*.70)
  rx=.410*flare*math.sin(phi);ry=.382*flare*math.sin(phi)
  h=.232*math.cos(phi)+.022*math.sin(a)*v
  return cap_c+Vector((rx*math.sin(a),-ry*math.cos(a),h))
 b.grid(naval_crown,q(18,34),q(7,12),'cloth','Head',True,True,uvfn=lambda u,v:(u,.22+.48*v))
 # Fitted lower headband hugging the head skull seamlessly
 b.grid(lambda u,v:cap_c+Vector(((.418-.028*v)*math.sin(T*u+math.pi),-(.390-.026*v)*math.cos(T*u+math.pi),.008-.058*v)),q(18,34),2,'cloth','Head',True,False,uvfn=lambda u,v:(u,.42+.14*v))
 # Crisp gleaming gold cap chinstrap cord band wrapping around the front crown base
 b.grid(lambda u,v:cap_c+Vector(((.428+.006*math.sin(math.pi*v))*math.sin(T*u+math.pi),-(.400+.006*math.sin(math.pi*v))*math.cos(T*u+math.pi),.012+.028*v)),q(18,30),2,'gold','Head',True,True)
 # Solid 3D curved dark-navy peaked visor angled cleanly above tucked brow tufts so eyes shine open in 06-captains-deck!
 def cap_visor_3d(u,v,layer):
  ang=(u-.5)*math.pi*.86;ca,sa=math.cos(ang),math.sin(ang);taper=math.sin(math.pi*u)**.85
  x=.418*sa+.028*sa*v
  y=-.382*ca-.225*v*taper
  z=.006-.024*v*taper-.014*(1.0-ca)+.008*sa
  th=.013*(math.sin(math.pi*v)**.55)*(taper**.45)
  return cap_c+Vector((x,y,z+layer*th))
 for layer in (-1,1):
  b.grid(lambda u,v,layer=layer:cap_visor_3d(u,v,layer),q(12,24),q(3,6),'cloth','Head',reverse=layer>0,uvfn=lambda u,v:(u,.18+.28*v))
 # Prominent gleaming gold captain's cap front crest emblem
 b.ellipsoid(cap_c+Vector((0,-.420,.118)),(.058,.024,.064),'gold','Head',q(8,14),q(4,8))
 return b.object(mat,rig,'Captain Bay',ground=True)

# ---------------------------------------------------------------------------
# 4. ECHO (Friendly High-Contrast Beluga Explorer with Cobalt & Gold Outfit)
# ---------------------------------------------------------------------------
ECHO_SPINE=[
 (-1.24,1.44,.000,.000,.000),  # 0: smooth rostrum snout tip
 (-1.19,1.45,.235,.165,.135),  # 1: fuller rounded smiling beluga rostrum
 (-1.07,1.50,.355,.300,.182),  # 2: silky smooth melon forehead transition (zero concave pinch!)
 (-0.87,1.56,.482,.458,.305),  # 3: FULL ROUNDED BELUGA MELON FOREHEAD
 (-0.60,1.54,.555,.495,.375),  # 4: broad adorable melon crown & cheeks
 (-0.32,1.44,.520,.450,.385),  # 5: gentle beluga neck crease (scarf seat)
 ( 0.04,1.34,.575,.490,.445),  # 6: plump buoyant whale chest/mid-torso
 ( 0.45,1.21,.455,.400,.365),  # 7: strong curving rear torso
 ( 0.82,1.09,.285,.255,.235),  # 8: muscular cetacean caudal tailstock
 ( 1.14,1.03,.150,.140,.130),  # 9: peduncle root of crescent flukes
 ( 1.28,1.02,.000,.000,.000),  # 10: closed rear end inside fluke bridge
]

def _echo_curve(points,t):
 q=max(0.0,min(len(points)-1.000001,t));i=int(q);u=q-i
 a,b,c,d=(points[max(0,i-1)],points[i],points[i+1],points[min(i+2,len(points)-1)])
 return tuple(b0+.5*u*((c0-a0)+u*((2*a0-5*b0+4*c0-d0)+u*(3*b0-3*c0+d0-a0))) for a0,b0,c0,d0 in zip(a,b,c,d))

def _echo_snout_params(v0=.11,th0=math.radians(55.0)):
 n=len(ECHO_SPINE)-1;eps=1e-4
 p0=_echo_curve(ECHO_SPINE,v0*n)
 pm=_echo_curve(ECHO_SPINE,(v0-eps)*n);pp=_echo_curve(ECHO_SPINE,(v0+eps)*n)
 dp=[(b-a)/(2.0*eps) for a,b in zip(pm,pp)]
 s0,c0=math.sin(th0),math.cos(th0)
 Y1=dp[0]*v0/(th0*s0);y_tip=p0[0]-Y1*(1.0-c0)
 Z1=dp[1]*v0/(th0*s0);z_tip=p0[1]-Z1*(1.0-c0)
 r_ab=[]
 for idx in (2,3,4):
  R0,dR0=p0[idx],dp[idx]
  rhs=dR0*(v0/th0)*s0/c0
  a3=(rhs-R0)/(2.0*(s0**3))
  a1=(R0-a3*(s0**3))/s0
  r_ab.append((a1,a3))
 return v0,th0,y_tip,Y1,z_tip,Z1,r_ab

_ECHO_CAP=_echo_snout_params()

def echo_eye(side):
 # v34 MIN 2: Gently tucked eyes seated cleanly inside sculpted 3D orbital sockets with snug outer brow/cheek wrap!
 c=Vector((side*.308,-1.004,1.674));n=Vector((side*.24,-.968,.08)).normalized()
 h=Z.cross(n).normalized();v=n.cross(h).normalized()
 return c,h,v,n

_ECHO_EYE_FRAMES=[(-1,*echo_eye(-1)),(1,*echo_eye(1))]

def _echo_raw(u,v):
 a=T*u;ca,sa=math.cos(a),math.sin(a)
 v0,th0,y_tip,Y1,z_tip,Z1,r_ab=_ECHO_CAP
 if v<v0:
  # m2 v29: Exact C1-continuous smooth ellipsoidal snout dome (y ~ y_tip + O(r^2) at v=0, exact value+slope match at v=v0 -> ZERO cone nub or ring crease!).
  th=(v/v0)*th0;st,ct=math.sin(th),math.cos(th);st3=st**3
  y=y_tip+Y1*(1.0-ct);zc=z_tip+Z1*(1.0-ct)
  rx=max(0.0,r_ab[0][0]*st+r_ab[0][1]*st3)
  rzt=max(0.0,r_ab[1][0]*st+r_ab[1][1]*st3)
  rzb=max(0.0,r_ab[2][0]*st+r_ab[2][1]*st3)
  off=0.0
 elif v>.945:
  t=(1.0-v)/.055;vs=.945;sc=math.sin(t*math.pi*.5);off=.072*(1.0-sc)
  y,zc,rx,rzt,rzb=_echo_curve(ECHO_SPINE,vs*(len(ECHO_SPINE)-1))
  rx=max(0.0,rx)*sc;rzt=max(0.0,rzt)*sc;rzb=max(0.0,rzb)*sc
 else:
  y,zc,rx,rzt,rzb=_echo_curve(ECHO_SPINE,v*(len(ECHO_SPINE)-1))
  rx=max(0.0,rx);rzt=max(0.0,rzt);rzb=max(0.0,rzb);off=0.0
 rz=rzt*(.5+.5*ca)+rzb*(.5-.5*ca)
 # v33 MIN 9: Gentle C1-smooth sculpted beluga melon-to-muzzle/lip contour, tiny nose/breathing crest & plump muzzle-cheek pads
 # (100% smooth C1 at v=0 snout apex so ZERO pole pinch/nub while giving unmistakable front-on dimensionality!).
 t_s=min(1.0,v/.032);v_sm=t_s*t_s*(3.0-2.0*t_s)
 dorsal_f=max(0.0,ca)
 # 1) Plump forward-projecting beluga rostrum/upper-lip muzzle cushion (d/dv=0 at v=0 -> exact C1 smooth!)
 muzzle_fwd=-.038*math.exp(-((v/.066)**2))
 # 2) Plump iconic beluga melon forehead swell above a gentle natural melon-to-muzzle saddle contour
 melon_puff=.034*math.exp(-((v-.195)/.075)**2)*(dorsal_f**1.35)*v_sm
 melon_saddle=-.020*math.exp(-((v-.096)/.028)**2)*(dorsal_f**1.45)*v_sm
 # 3) Tiny gentle raised nose/breathing crest right on top-front of the muzzle (v~0.056)
 nose_crest=.011*math.exp(-((v-.056)/.018)**2)*(dorsal_f**2.6)*v_sm
 # 4) Twin plush smiling upper-lip muzzle pads & soft lower cheek pads flanking the smile
 lip_pads=.020*math.exp(-((v-.068)/.036)**2)*(sa**2)*(max(0.0,.62+.38*ca)**1.1)*v_sm
 cheek_pads=.016*math.exp(-((v-.155)/.055)**2)*(sa**2)*max(0.0,.55-.45*ca)*v_sm
 x_out=(rx+lip_pads*.75+cheek_pads*.90)*sa
 y_out=y+off+muzzle_fwd-melon_puff*.72-melon_saddle*.45-nose_crest*.75-lip_pads*.42
 z_out=zc+rz*ca+(melon_puff*.65+melon_saddle*.78+nose_crest*.65)*dorsal_f
 p0=Vector((x_out,y_out,z_out))
 # v34 MIN 2: Silky-smooth 3D orbital socket recess (~0.034 inward along eye normal) + snug outer brow/cheek wrap
 # so the far eye stays cleanly tucked INSIDE the beluga head silhouette in quarter.png!
 if v<.45 and v_sm>0.0:
  r_eye_e=.172
  for s_e,ec,eh,ez,en in _ECHO_EYE_FRAMES:
   d=p0-ec;dn=d.dot(en)
   if dn>-.35:
    fg=smooth_w(-.35,-.04,dn)
    dh=d.dot(eh);dz=d.dot(ez)
    rr=math.hypot(dh,dz)/r_eye_e
    if rr<2.4:
     dh_out=s_e*dh/r_eye_e
     socket=-.042*math.exp(-((rr/.94)**2))
     rim_ring=math.exp(-(((rr-1.26)/.40)**2))
     out_w=.38+.62*smooth_w(-.20,.60,dh_out)
     brow_cheek=.026*rim_ring*out_w
     p0=p0+en*((socket+brow_cheek)*fg*v_sm)
 return p0

def echo_nrm(u,v):
 e=1e-3;v0=max(.004,min(.996,v))
 pu=_echo_raw((u+e)%1.0,v0)-_echo_raw((u-e)%1.0,v0)
 pv=_echo_raw(u,min(.998,v0+e))-_echo_raw(u,max(.002,v0-e))
 n=pu.cross(pv)
 if n.length<1e-9:
  return Vector((0,-1,0)) if v<.5 else Vector((0,1,0))
 return n.normalized()

def echo_surface(u,v,extra=0):
 p=_echo_raw(u,v)
 return p+echo_nrm(u,v)*extra if extra else p

def echo_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 def body_w(p,u,v):
  head=1.0-smooth_w(.36,.54,v);tail=smooth_w(.64,.88,v)
  return {'Head':head,'Body':max(0.0,1.0-head-tail),'Tail':tail}
 # m2 v29: Welded single smooth snout apex at v=0 with clean outward triangle cap -> exact (0,-1,0) smooth normal, ZERO degenerate-quad pole artifact or shiny nub!
 nb,mb=q(36,56),q(30,48)
 apex=len(b.v);p_ap=echo_surface(0.0,0.0);b.v.append(p_ap);b.w.append(body_w(p_ap,0.0,0.0))
 ring_off=len(b.v)
 for j in range(1,mb+1):
  vj=j/mb
  for i in range(nb):
   ui=i/nb;p=echo_surface(ui,vj);b.v.append(p);b.w.append(body_w(p,ui,vj))
 for i in range(nb):
  i1=(i+1)%nb
  b.f.append((apex,ring_off+i1,ring_off+i))
  b.uv.extend([uv('skin',.5,.015),uv('skin',(i+1)/nb,1/mb),uv('skin',i/nb,1/mb)])
 for j in range(mb-1):
  for i in range(nb):
   i1=(i+1)%nb
   r0=ring_off+j*nb;r1=ring_off+(j+1)*nb
   b.f.append((r0+i,r0+i1,r1+i1,r1+i))
   b.uv.extend([uv('skin',i/nb,(j+1)/mb),uv('skin',(i+1)/nb,(j+1)/mb),uv('skin',(i+1)/nb,(j+2)/mb),uv('skin',i/nb,(j+2)/mb)])

 for s,suf in ((-1,'L'),(1,'R')):
  # v34 MIN 2: Deeply seated living teal-aqua eyes inside sculpted 3D orbital sockets (far eye tucked cleanly inside quarter.png silhouette!)
  eye(b,s,q(18,28),q(12,18),echo_eye,.168,echo_surface,'echo',res=(q(36,56),q(30,48)),depth=.048,swell=.028,lid_scale=.62)
  # v27 Minor #5: Genuinely plump, chunky 3D oval-hydrofoil beluga pectoral flippers (~2.8x thicker Z-profile at
  # mid/outer paddle, plump rounded leading & trailing edges, smooth convex top & bottom camber, rounded cushioned tip!)
  def flip_spine(v,s=s):
   return Vector((
    s*(.34+.66*(v**.90)-.02*(v**2)),
    -.06+.26*(v**1.15)-.03*math.sin(math.pi*v),
    1.15-.15*v+.078*(v**2.05),
   ))
  def flip_paddle(u,v,s=s):
   a=T*u
   # Concentrate rings smoothly around the plump rounded paddle tip (v_span -> 1)
   v_span=.48*v+.52*math.sin(v*math.pi*.5)
   c=flip_spine(v_span,s)
   t_sp=(flip_spine(min(1.0,v_span+.004),s)-flip_spine(max(0.0,v_span-.004),s)).normalized()
   n_ref=Vector((0,0,1))
   c_dir=t_sp.cross(n_ref).normalized()
   if c_dir.y<0:c_dir=-c_dir  # +c_dir points aft (+Y trailing edge), -c_dir points forward (-Y leading edge)
   n_up=c_dir.cross(t_sp).normalized()
   if n_up.z<0:n_up=-n_up
   # Authentic chunky broad beluga spoon-paddle closing smoothly into a plump rounded 3D tip (never thin flat blades!)
   tip_arc=math.sqrt(max(0.0,1.0-max(0.0,(v_span-.54)/.46)**2))
   tip_th=(max(0.0,1.0-max(0.0,(v_span-.52)/.48)**2.2))**.46
   root_flare=1.0+.28*math.exp(-((v_span/.25)**2))
   spoon_w=.84+.30*math.sin(v_span*math.pi*.68)
   chord_half=.225*spoon_w*root_flare*tip_arc
   # Plump symmetrical-convex 3D OVAL hydrofoil cross-section (thick rounded leading & trailing edges, smooth convex top & bottom!)
   xc=.5*(1.0+math.cos(a))
   oval_shape=1.08-.16*xc
   s_ang=math.sin(a)
   asym=1.04 if s_ang>=0.0 else .96
   max_th=.152*(1.0-.16*v_span)*root_flare*tip_th
   camber=.012*math.sin(math.pi*xc)*(1.0-.20*v_span)*tip_th
   ch_off=(xc-.42)*(2.0*chord_half)
   th_off=camber+max_th*oval_shape*s_ang*asym
   return c+c_dir*ch_off+n_up*th_off
  def flip_w(p,u,v,suf=suf):
   w_f=smooth_w(.04,.28,v)
   return {'Body':1.0-w_f,'Fin.'+suf:w_f}
  b.grid(flip_paddle,q(18,28),q(12,18),'fin',flip_w,True,reverse=(s<0),uvfn=lambda u,v:(u,v))

 # v30 Minor #4: Plump, chunky 3D oval-hydrofoil twin rounded beluga tail flukes (pitched +26 deg upward)
 # with broad semicircular cushioned outer lobes, plush 3D thickness (~3.0x v29, zero pointy tip or thin spike!),
 # and a crisp open median V-notch so BOTH rounded beluga lobes read cleanly from 09-caves & quarter.png!
 ca26,sa26=math.cos(math.radians(26.0)),math.sin(math.radians(26.0))
 fluke_root=Vector((0.0,1.08,1.03))
 for s in (-1,1):
  def echo_fluke_lobe(u,v,s=s):
   ang=T*u
   # Smooth semicircular span parameterization so leading & trailing edges meet with full cushioned roundness (ZERO spike!)
   u_x=math.sin(v*math.pi*.5)
   tip_c=math.cos(v*math.pi*.5)
   lx=s*(.80*u_x)
   y_tip=.40
   # Broad convex beluga leading margin staying full right out to the plump semicircular outer paddle tip
   y_lead=y_tip-.48*(tip_c**.55)
   # Broad plump rounded beluga trailing lobe with crisp deep open median V-notch at x=0 (world y=1.28 encloses peduncle tip cleanly!)
   notch=.26*math.exp(-((u_x/.34)**1.8))
   y_trail=y_tip+.34*(u_x**.65)*(tip_c**.50)-notch
   chord_y=max(.010,y_trail-y_lead)
   # Plump symmetrical-convex 3D OVAL hydrofoil cross-section matching Echo's chunky rounded oval pectoral flippers!
   xc=.5*(1.0+math.cos(ang))
   oval_shape=1.08-.14*xc
   s_ang=math.sin(ang)
   asym=1.05 if s_ang>=0.0 else .95
   tip_th=tip_c**.34
   root_blend=.022*math.exp(-((u_x/.24)**2))
   half_th=(.142*(1.0-.16*u_x)+root_blend)*tip_th
   camber=.018*math.sin(math.pi*xc)*tip_th
   ly_local=y_lead+xc*chord_y
   lz_local=camber+half_th*oval_shape*s_ang*asym
   ry=ly_local*ca26-lz_local*sa26
   rz=ly_local*sa26+lz_local*ca26+.055*(u_x**2)
   return fluke_root+Vector((lx,ry,rz))
  b.grid(echo_fluke_lobe,q(16,24),q(12,18),'fin','Tail',True,reverse=(s<0),uvfn=lambda u,v:(u,.20+.80*v))

 # v28 Minor #10: Joyful pure monotonic U-arc beluga smile seated cleanly on the front rostrum face
 # (~16% narrower inboard, well above chin bottom & strictly inside white snout silhouette in BOTH front.png & quarter.png!).
 def echo_smile_pt(t):
  s=.76*(2.0*t-1.0)
  ang_lift=math.sin(s*math.pi*.5)
  uu=(.50-.195*ang_lift)%1.0
  vv=.064+.092*(s**2)
  dr=.0045*(1.0-.85*(s**2))
  return echo_surface(uu,vv,dr)
 def echo_smile_rad(t):
  base=.0120*(.80+.22*math.sin(math.pi*t))
  if t<.15:return base*math.sqrt(max(0.0,1.0-((.15-t)/.15)**2))
  if t>.85:return base*math.sqrt(max(0.0,1.0-((t-.85)/.15)**2))
  return base
 b.tube(echo_smile_pt,echo_smile_rad,q(7,10),q(16,24),'dark','Head')

 # M1 v21: Clean, 100% symmetrical, cozy terracotta-coral & sunlit-marigold knotted explorer neckerchief around the neck
 # (ZERO forehead strap, ZERO diagonal body sash, ZERO mid-flank ear-cup satchel, ZERO asymmetrical side flag-fin!).
 def neckerchief_collar(u,v):
  a=T*u
  # Gentle symmetrical collar line: sits warmly at neck nape (v=0.51) and dips slightly forward under chin (v=0.46)
  v_mid=.486+.024*math.cos(a)
  hw=.046+.006*(.5-.5*math.cos(a))
  vv=v_mid+(2.0*v-1.0)*hw
  fold=.004*math.cos(a*2.0)
  if v<.16:dr=-.005+(.034+fold)*math.sin((v/.16)*math.pi*.5)
  elif v>.84:dr=-.005+(.034+fold)*math.sin(((1.0-v)/.16)*math.pi*.5)
  else:dr=.029+fold+.011*math.sin(math.pi*v)
  return echo_surface(u,vv,dr)
 b.grid(neckerchief_collar,q(34,52),q(7,12),'cloth',body_w,True,False)

 # Symmetrical explorer bandana V-triangle draping smoothly flat across Echo's upper dorsal back (reads clearly in quarter & 09-caves overhead!).
 def neckerchief_back(u,v):
  s=2.0*u-1.0
  span=.195*(1.0-.82*(v**1.20))
  uu=(s*span)%1.0
  vv=.512+.158*v-.012*(s**2)*(1.0-v)
  tuck=(math.sin(math.pi*u)**.42)*(math.sin(math.pi*v)**.38)
  dr=-.004+.028*tuck
  return echo_surface(uu,vv,dr)
 b.grid(neckerchief_back,q(18,28),q(10,16),'rim',body_w,False,False,uvfn=lambda u,v:(u,1.0-v))

 # Cozy centered front neckerchief knot + gleaming marigold-gold explorer slide ring + twin 100% symmetrical short tucked ends under the throat!
 # Weighted with exact collar neck blend so knot & gold slide track seamlessly with Head/Body motion!
 knot_p=echo_surface(.50,.458,.044)
 knot_w=body_w(knot_p,.50,.455)
 b.ellipsoid(echo_surface(.50,.442,.042),(.076,.040,.042),'gold',lambda p,u,v,kw=knot_w:kw,q(12,18),q(6,10))
 b.ellipsoid(knot_p,(.066,.056,.052),'cloth',lambda p,u,v,kw=knot_w:kw,q(12,18),q(6,10),uvfn=lambda u,v:(u,.40+.20*v))
 for s in (-1,1):
  def end_center(v,s=s):
   return knot_p+Vector((s*(.038+.135*v+.015*math.sin(v*math.pi)),.045+.215*v,-.036-.068*v-.014*math.sin(v*math.pi)))
  def end_ribbon(u,v,s=s):
   a=T*u;c=end_center(v,s)
   w=(.042+.024*v)*math.sqrt(max(0.0,1.0-(v**5.0)))
   th=.015*math.sqrt(max(0.0,1.0-(v**4.5)))
   return c+Vector((.88*w*math.cos(a),s*.24*w*math.cos(a),th*math.sin(a)-.38*w*abs(math.cos(a))*.25))
  def end_ribbon_w(p,u,v,kw=knot_w):
   tb=smooth_w(.05,.55,v)
   return {'Head':kw['Head']*(1.0-tb),'Body':1.0-kw['Head']*(1.0-tb)}
  b.grid(end_ribbon,q(10,14),q(8,14),'cloth',end_ribbon_w,True,reverse=(s<0),uvfn=lambda u,v:(v,abs(2*u-1)))
 return b.object(mat,rig,'Echo')

# ---------------------------------------------------------------------------
# 5. JISU (Bottle Beach Hermit Crab Letter-Writer — v38 Cohesive Organic Bridge + Smooth Weights + Snug Quill Grip)
# ---------------------------------------------------------------------------
def jisu_head(u,v):
 a=T*u;phi=math.pi*(.002+.996*v);sp,cp=math.sin(phi),math.cos(phi)
 ca,sa=math.cos(a),math.sin(a)
 back=max(0.0,-ca)
 cheek=1.0+.065*(sp**2)*(sa**2)
 # Smooth organic rear flow into the thorax/shell collar (eliminates ball-on-ball snowman crease!).
 rear_flow=.085*(back**1.35)*sp
 return Vector((.48*sp*sa*cheek,-.72-.42*sp*ca+rear_flow,.98+.36*cp))

def jisu_eye(side):
 # v41 MAJ-1: Warm joyful smiling crescent-almond eyes (aspect=1.32, lower-lid smile lift, bright GOLDEN-AMBER iris!)
 c=Vector((side*.216,-1.072,1.102));n=Vector((side*.27,-.91,.30)).normalized()
 h=Z.cross(n).normalized();v=n.cross(h).normalized()
 return c,h,v,n

# v34 MAJ 4: Genuine plump, bulbous, coiled 3D conical/turbinate hermit shell spine tapering smoothly rearward!
# v = 0 (coiled rounded spire apex at rear +Y) -> v = 1 (oblique hooded front aperture framing Jisu's thorax).
JISU_SHELL_SPINE=[
 (.11, 1.60,1.18),  # 0 (v=0.00): tapered rounded coiled spire apex tip
 (.09, 1.26,1.17),  # 1 (v=0.25): 3rd coiled whorl tapering smoothly rearward
 (.06, 0.84,1.15),  # 2 (v=0.50): 2nd plump bulbous coiled whorl
 (.02, 0.34,1.11),  # 3 (v=0.75): full bulbous body whorl belly
 (.00,-0.07,0.98),  # 4 (v=1.00): oblique front aperture center
]

def _jisu_shell_center(t):
 return Vector(_echo_curve(JISU_SHELL_SPINE,max(0.0,min(1.0,t))*(len(JISU_SHELL_SPINE)-1)))

def _jisu_shell_frame(t):
 p0=_jisu_shell_center(max(0.0,t-.004))
 p1=_jisu_shell_center(min(1.0,t+.004))
 fwd=(p1-p0).normalized()   # points forward (~ -Y) from rear apex toward front aperture
 right=fwd.cross(Z)
 if right.length<.05:right=Vector((1,0,0))
 right.normalize()
 if right.x<0:right=-right
 up=right.cross(fwd).normalized()
 if up.z<0:up=-up
 return _jisu_shell_center(t),fwd,right,up

def jisu_shell(u,v,extra=0.0):
 # v34 MAJ 4: True volumetric bulbous coiled 3D turbinate gastropod shell (3.6 overlapping coiled whorls)!
 # Cross-sections lie perpendicular to the gently arched rearward spine, each whorl swells into a plump
 # rounded pillow with recessed C1 helical sutures, subtle axial toroidal overhang, natural corkscrew coil
 # eccentricity, and a smoothly domed oblique front aperture (ZERO flat vertical curtain!).
 p,fwd,right,up=_jisu_shell_frame(v)
 a=T*u;ca,sa=math.cos(a),math.sin(a)
 # Smooth closed rounded spire apex cap (v < 0.06) + plump turbinate dome peaking at body whorl (v ~ 0.80)
 # and rounding smoothly inward toward the front aperture (v = 1.00).
 cap_k=math.sin(min(1.0,v/.055)*math.pi*.5)
 front_tuck=smooth_w(.84,1.0,v)**1.60
 dome_env=.755*(v**.90)*(1.0+.22*math.sin(math.pi*(v**1.35)))-.155*front_tuck
 dome_env=max(0.0,dome_env)*cap_k
 # 3.6 overlapping coiled whorls synchronized 1:1 with the spiral color bands in paint_tile('rim')!
 phi_v=3.6*(max(0.0,min(1.0,v))**.76)
 phi=phi_v+u
 wf=phi%1.0
 whorl_fade=smooth_w(.02,.12,v)*(1.0-smooth_w(.85,.985,v))
 # Plump circular-arch whorl bulge with crisp C1-smooth recessed helical suture crease at wf = 0 / 1
 s_w=math.sqrt(math.sin(math.pi*wf)**2+.012)
 bulb=((s_w-.1095)/.8965)**.56
 # Deep sculpted whorl modulation: recessed suture (-0.11*dome) -> inflated bulbous whorl crown (+0.15*dome)
 whorl_dr=(.255*(bulb-.42))*dome_env*whorl_fade
 # Subtle toroidal axial overhang along spine tangent (strictly monotonic -> rounded overlapping coils!)
 ds_ax=-.044*(.38+.62*v)*math.sin(T*wf)*whorl_fade
 # Organic corkscrew coiling eccentricity around the central spire axis (eliminates rigid lathe look!)
 ecc=.056*dome_env*whorl_fade
 coil_off=right*(ecc*math.cos(T*phi_v))+up*(ecc*math.sin(T*phi_v))
 # Graceful oblique prosocline aperture hood near v -> 1: upper lip curves warmly forward over thorax while
 # lower rim tucks gently back behind the legs (ZERO flat vertical front wall!).
 ap_t=smooth_w(.64,1.0,v)**1.35
 hood=.135*sa*ap_t
 # Slight rounded gastropod oval (gently wider & plumper across belly, softly dome-vaulted on top)
 r=max(.003,dome_env+whorl_dr)+extra
 rx=r*(1.02+.03*abs(ca))
 rz=r*(1.01+.02*max(0.0,sa))
 return p+coil_off+fwd*(ds_ax+hood)+right*(rx*ca)+up*(rz*sa)

def jisu_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 # v39 MIN-14: Plump bulbous coiled 3D turbinate gastropod shell ('rim' tile) + warm cream-sand rolled aperture lip + warm softly shaded cream-peach interior collar!
 b.grid(lambda u,v:jisu_shell(u,v),q(22,44),q(26,48),'rim','Body',True,False,uvfn=lambda u,v:(u,.836*v))
 p_ap,fwd_ap,r_ap,u_ap=_jisu_shell_frame(1.0)
 def jisu_lip(u,v):
  base=jisu_shell(u,1.0,.006)
  a=T*u;ba=T*v
  rad=(r_ap*math.cos(a)+u_ap*math.sin(a)).normalized()
  return base+rad*(.044*math.cos(ba))+fwd_ap*(.042*math.sin(ba))
 b.grid(jisu_lip,q(22,38),q(4,7),'rim','Body',True,False,uvfn=lambda u,v:(u,.846+.064*(.5-.5*math.cos(T*v))))
 p_in=_jisu_shell_center(.72)
 def jisu_throat(u,v):
  rim=jisu_shell(u,.992,-.020)
  # Warm sunlit cream-peach interior shell collar curving cozily behind Jisu's head/thorax (replaces pure black void!)
  k=v**1.15
  collar_bow=math.sin(math.pi*v)*.062
  p_lin=rim.lerp(p_in,k)
  return p_lin+(rim-_jisu_shell_center(.992)).normalized()*collar_bow
 b.grid(jisu_throat,q(16,24),q(4,6),'rim','Body',True,False,uvfn=lambda u,v:(u,.920+.078*v))
 # Soft plush sunlit coral-peach hermit-crab head & continuous organic thorax/neck bridge (ZERO ball-on-ball snowman crease!).
 # Smooth gradient Head <-> Body weights across y in [-0.70, -0.26] (front face y <= -0.70 stays 100% Head so eyes, smile & postal cap stay crisp!).
 def jisu_head_w(p,u,v):
  wh=smooth_w(-.26,-.70,p.y)
  return {'Head':wh,'Body':1.0-wh}
 b.grid(jisu_head,q(26,44),q(16,26),'skin',jisu_head_w,True,True)
 JISU_THORAX=[
  (-.74,.96,.41,.31),  # 0: nested smoothly inside rear of jisu_head
  (-.48,.93,.46,.34),  # 1: full organic neck-to-shoulder bridge (eliminates snowman crease!)
  (-.18,.93,.48,.35),  # 2: plump carapace entering oblique shell aperture
  ( .08,.96,.42,.32),  # 3: tucked snugly inside shaded interior shell cavity
  ( .28,1.00,.00,.00), # 4: closed abdomen core deep inside shell
 ]
 def jisu_thorax(u,v):
  a=T*u;ca,sa=math.cos(a),math.sin(a)
  y,zc,rx,rz=_echo_curve(JISU_THORAX,v*(len(JISU_THORAX)-1))
  return Vector((max(0.0,rx)*sa,y,zc+max(0.0,rz)*ca))
 b.grid(jisu_thorax,q(14,22),q(6,10),'skin',jisu_head_w,True,False,uvfn=lambda u,v:(.36+.14*abs(2.0*u-1.0),.44+.28*v))
 # v41 MAJ-1: Warm joyful smiling crescent-almond golden-amber eyes (sculpted lower-lid smile lift!) + joyful smile + dainty antennae.
 for s,suf in ((-1,'L'),(1,'R')):
  eye(b,s,q(16,26),q(10,18),jisu_eye,.188,jisu_head,'jisu',res=(q(26,44),q(16,26)),depth=.135,swell=.052,lid_scale=1.04)
  # v27 Minor #7 + m5 v29 + v38: Root antennae cleanly with smooth Head->Antenna weight blend!
  ant_pts=[(s*.31,-.78,1.22),(s*.45,-.84,1.33),(s*.56,-.82,1.48),(s*.64,-.76,1.55)]
  def ant_pt(t,pts=ant_pts):return Vector(_echo_curve(pts,t*(len(pts)-1)))
  b.tube(ant_pt,lambda t:.015*(1.0-.80*t)+.003,q(5,7),q(9,14),'fin',_limb_w('Head','Antenna.'+suf,.04,.36),uvfn=lambda u,v:(u,.70+.26*v))
  # v28 Minor #6 + v38: Sculpted 3-segment articulated hermit-crab walking legs with smooth Body->Leg hip blend & organic hip flare!
  def _crab_seg(pa,pb,r0,rm,r1,bow,nu,nv,v0,v1,bname,oval=(1.0,1.0),tip_cap=False,hip_flare=False):
   d_ab=(pb-pa)
   t_ax=d_ab.normalized()
   ref=Vector((0,1,0)) if abs(t_ax.y)<.85 else Z
   u_ax=t_ax.cross(ref).normalized()
   w_ax=t_ax.cross(u_ax).normalized()
   def seg_fn(u,v):
    ang=T*u
    if tip_cap and v>.82:
     kt=(v-.82)/.18
     c=pa.lerp(pb,v)+bow*math.sin(math.pi*v)
     r=r1*math.sqrt(max(0.0,1.0-kt*kt))
     # Rounded hemispherical claw tip reaching exactly pb + (0,0,-r1) at v=1
     c=c+t_ax*(r1*math.sin(kt*math.pi*.5)*.45)
    else:
     c=pa.lerp(pb,v)+bow*math.sin(math.pi*v)
     # Smoothly bowed chitinous crustacean segment with clear pinched joint ends (hip root flares smoothly into thorax!)
     base_r=r0*(1.0-v)+r1*v+(rm-.5*(r0+r1))*math.sin(math.pi*v)
     p0_pinch=0.0 if hip_flare else math.exp(-((v/.14)**2))
     end_pinch=1.0-.16*(p0_pinch+math.exp(-(((1.0-v)/.14)**2)))
     hf=(1.0+.22*math.exp(-((v/.20)**2))) if hip_flare else 1.0
     r=base_r*hf*(1.0 if (tip_cap and v>.5) else end_pinch)
    return c+u_ax*(r*oval[0]*math.cos(ang))+w_ax*(r*oval[1]*math.sin(ang))
   b.grid(seg_fn,nu,nv,'fin',bname,True,False,uvfn=lambda u,v:(u,v0+(v1-v0)*v))
  for j in range(3):
   leg_bone='Leg%d.%s'%(j+1,suf)
   p0=Vector((s*(.30+.02*j),-.40+.24*j,.74))
   p1=Vector((s*(.73+.09*j),-.48+.28*j,.75+.05*j))   # Distinct elevated crab knee apex!
   p2=Vector((s*(.95+.11*j),-.60+.32*j,.35+.02*j))   # Distinct angled carpus/propodus -> ankle joint!
   p3=Vector((s*(.98+.11*j),-.74+.34*j,.026))        # Tapered dactylus claw tip landing flush at Z = 0.000!
   sc_j=1.0-.05*j
   # Segment 1: Angled Merus (smooth Body->Leg hip blend so upper thigh flexes organically out of thorax!)
   _crab_seg(p0,p1,.094*sc_j,.114*sc_j,.086*sc_j,Vector((0,0,.032)),q(6,10),q(4,7),.08,.38,_limb_w('Body',leg_bone,.02,.42),oval=(.92,1.12),hip_flare=True)
   # Knee Chitin Joint Knuckle (distinct articulated condyle collar between merus and carpus!)
   b.ellipsoid(p1,(.092*sc_j,.084*sc_j,.090*sc_j),'fin',leg_bone,q(6,10),q(3,5),uvfn=lambda u,v:(u,.44+.08*v))
   # Segment 2: Angled Carpus/Propodus (knee -> ankle, steep crustacean downward stance with crisp joint pinch)
   _crab_seg(p1,p2,.084*sc_j,.096*sc_j,.070*sc_j,Vector((s*.028,0,.016)),q(6,10),q(4,7),.54,.76,leg_bone,oval=(1.08,.94))
   # Ankle Chitin Joint Knuckle (smaller subtle chitin condyle between propodus and dactylus!)
   b.ellipsoid(p2,(.072*sc_j,.068*sc_j,.070*sc_j),'fin',leg_bone,q(6,10),q(3,5),uvfn=lambda u,v:(u,.44+.08*v))
   # Segment 3: Tapered Dactylus Tip (ankle -> curved tapered claw toe resting solidly at Z = 0.000!)
   _crab_seg(p2,p3,.068*sc_j,.054*sc_j,.022,Vector((s*.022,-.018,0)),q(6,10),q(4,7),.78,.96,leg_bone,oval=(1.0,.96),tip_cap=True)
 # Warm friendly upturned smile cleanly centered below the eyes on Jisu's sunlit coral-peach head.
 def jisu_smile_pt(t):
  s=2.0*t-1.0
  return Vector((.144*s,-1.138+.035*(s**2),.856+.044*(s**2)))
 def jisu_smile_r(t):
  base=.0155*(.78+.22*math.sin(math.pi*t))
  if t<.12:return base*math.sqrt(max(0.0,1.0-((.12-t)/.12)**2))
  if t>.88:return base*math.sqrt(max(0.0,1.0-((t-.88)/.12)**2))
  return base
 b.tube(jisu_smile_pt,jisu_smile_r,q(5,8),q(10,16),'dark','Head')
 # Left cheliped (Claw.L): smooth Body->Claw.L shoulder blend + flared shoulder root (zero detached seam!).
 l_arm=[(-.31,-.68,.76),(-.56,-.90,.58),(-.66,-1.10,.48)]
 b.tube(lambda t:Vector(_echo_curve(l_arm,t*2.0)),lambda t:.120*(1.0+.24*math.exp(-((t/.20)**2)))*(1.0-.16*t),q(7,10),q(8,12),'fin',_limb_w('Body','Claw.L',.04,.38))
 b.ellipsoid((-.66,-1.10,.48),(.210,.225,.245),'fin','Claw.L',q(12,18),q(7,11))
 l_p1=[(-.78,-1.14,.47),(-.84,-1.20,.30),(-.72,-1.22,.21)]
 l_p2=[(-.56,-1.15,.46),(-.58,-1.24,.31),(-.68,-1.24,.24)]
 for pts,r0 in ((l_p1,.112),(l_p2,.082)):
  b.tube(lambda t,pts=pts:Vector(_echo_curve(pts,t*2.0)),lambda t,r0=r0:r0*(1.0-.58*t)*math.sqrt(max(0.0,1.0-max(0.0,(t-.84)/.16)**2)),q(6,9),q(7,10),'fin','Claw.L')
 # Right cheliped (Claw.R): smooth Body->Claw.R shoulder blend on upper arm + palm, closed pincers & feather quill 100% locked to Claw.R!
 r_arm=[(.33,-.66,.78),(.56,-.86,.75),(.74,-1.04,.75)]
 b.tube(lambda t:Vector(_echo_curve(r_arm,t*2.0)),lambda t:.108*(1.0+.24*math.exp(-((t/.20)**2)))*(1.0-.16*t),q(7,10),q(8,12),'fin',_limb_w('Body','Claw.R',.04,.38))
 b.ellipsoid((.74,-1.04,.75),(.132,.142,.148),'fin','Claw.R',q(12,18),q(7,11),uvfn=lambda u,v:(u,.22+.36*v))
 # Quill grip seated cleanly inside the closed pincer C-clamp pocket; shaft angles proudly forward (-Y), outward (+X) & up (+Z)!
 q_grip=Vector((.94,-1.14,.79))
 q_dir=Vector((.52,-.54,.66)).normalized()
 q_side=Z.cross(q_dir).normalized()
 q_up=q_dir.cross(q_side).normalized()
 # Upper/front movable pincer finger: arches from top-front of palm OVER & IN FRONT (-Y) of the brass grip ferrule and curls snugly around outer side of shaft!
 r_pu=[(.77,-1.08,.85),(.87,-1.185,.865),(.975,-1.195,.825),(1.002,-1.145,.768)]
 # Lower/back fixed pincer finger: cradles snugly UNDERNEATH & BEHIND the quill shaft, curving up around outer side to close cleanly around the barrel!
 r_pl=[(.77,-1.06,.66),(.89,-1.105,.672),(.982,-1.102,.742),(1.002,-1.108,.804)]
 for pts,r0 in ((r_pu,.064),(r_pl,.060)):
  b.tube(
   lambda t,pts=pts:Vector(_echo_curve(pts,t*(len(pts)-1))),
   lambda t,r0=r0:r0*(1.0-.44*t)*math.sqrt(max(0.0,1.0-max(0.0,(t-.84)/.16)**2)),
   q(7,10),q(9,14),'fin','Claw.R',uvfn=lambda u,v:(u,.56+.40*v)
  )
 # v39 MIN-12: Graceful curved ivory quill barrel passing cleanly THROUGH the closed pincers + bolder sculpted 3D feather plume!
 def quill_c(t):
  s=-.22+1.46*t
  return q_grip+q_dir*s-q_up*(.068*(t**2))+q_side*(.028*(t**2))
 b.tube(quill_c,lambda t:(.036*(1.0-.48*t)) if t>.09 else (.009+.027*(t/.09)),q(7,10),q(12,18),'ivory','Claw.R')
 # Dark ink writing nib tip emerging cleanly BELOW the closed pincer grip (clear of legs & palm).
 b.tube(lambda t:q_grip-q_dir*(.16+.090*t),lambda t:.025*(1.0-.92*t),q(6,8),q(4,6),'dark','Claw.R')
 # Gleaming brass grip ferrule seated snugly RIGHT INSIDE the clamping pincers.
 b.tube(lambda t:q_grip+q_dir*(-.060+.120*t),lambda t:.040*(.90+.10*math.sin(math.pi*t)),q(8,12),q(4,6),'gold','Claw.R',uvfn=lambda u,v:(u,.62+.30*v))
 # Bold unmistakable 3D coastal lagoon-teal & sunlit-coral feather quill vane — longer tapered lanceolate plume,
 # 3 crisp sculpted barb V-notches & thicker beveled 3D vane thickness so its feather silhouette reads crisply at encounter distance!
 _cr,_sr=math.cos(math.radians(-24.0)),math.sin(math.radians(-24.0))
 q_bw=(q_up*_cr+q_side*_sr).normalized()
 q_bt=(-q_up*_sr+q_side*_cr).normalized()
 def plume_pt(u,v):
  a=T*u;tc=.24+.76*v
  c=quill_c(tc)
  ca,sa=math.cos(a),math.sin(a)
  # Iconic tapered pointed feather outline (broad graceful mid-plume tapering cleanly to a crisp curved tip — NOT a round disc!)
  env=(math.sin(math.pi*(.02+.96*v))**.76)*(1.0-.44*(v**1.95))
  # Subtle realistic feather asymmetry (slightly wider outer trailing vane)
  asym=1.12 if ca>=0.0 else .88
  # 3 crisp sculpted feather-barb V-notches along alternating edges so the feathered silhouette pops even at small encounter scale!
  n1=.34*math.exp(-((v-.34)/.036)**2)*(1.0 if ca<0 else .08)
  n2=.40*math.exp(-((v-.58)/.040)**2)*(1.0 if ca>0 else .10)
  n3=.34*math.exp(-((v-.77)/.036)**2)*(1.0 if ca<0 else .08)
  notch=max(.28,1.0-n1-n2-n3)
  w=.206*env*asym*notch
  # Thicker beveled 3D feather vane cushion (plump along rachis, soft rounded feathered margins — never paper-thin!)
  th=.050*(math.sin(math.pi*v)**.52)*(.48+.52*(1.0-.55*abs(ca)))
  return c+q_bw*(w*ca-.016*env)+q_bt*(th*sa+.034*w*(ca**2))
 b.grid(plume_pt,q(12,18),q(16,24),'cloth','Claw.R',True,True,uvfn=lambda u,v:(.5+.48*math.cos(T*u),.03+.50*v))
 # m5 v29: Postal sky-blue courier cap re-seated SNUGLY on top of Jisu's HEAD/upper brow arch (weighted to 'Head', NOT perched back on the shell!),
 # cleanly framed above her cheerful arched brows & bright amber eyes and clearing the shell aperture behind with crisp daylight!
 jp_c=Vector((.00,-.69,1.246))
 jp_ang=math.radians(-6)
 jp_up=Vector((0.0,-math.sin(jp_ang),math.cos(jp_ang))).normalized()
 jp_fwd=Vector((0.0,-math.cos(jp_ang),-math.sin(jp_ang))).normalized()
 jp_r=Vector((1.0,0.0,0.0))
 def jisu_cap_crown(u,v):
  a=T*u+math.pi  # seam at back +Y
  if v<.45:
   t=v/.45;rx=.344*math.sin(t*math.pi*.5);ry=.308*math.sin(t*math.pi*.5);h=.234-.020*(t**2)
  else:
   t=(v-.45)/.55;rx=.344-.030*t;ry=.308-.032*t;h=.214-.242*t
  return jp_c+jp_r*(rx*math.sin(a))+jp_fwd*(ry*math.cos(a))+jp_up*h
 b.grid(jisu_cap_crown,q(18,30),q(6,10),'cloth','Head',True,True,uvfn=lambda u,v:(u,.96-.28*v))
 # Gleaming brass cap band hugging the postal head cap base!
 b.grid(lambda u,v:jp_c+jp_r*((.322-.008*v)*math.sin(T*u+math.pi))+jp_fwd*((.286-.008*v)*math.cos(T*u+math.pi))+jp_up*(.044-.044*v),q(18,30),1,'gold','Head',True,True,uvfn=lambda u,v:(u,.62+.30*v))
 # Solid 3D curved sky-blue peak visor framing Jisu's upper brow arch cleanly above her bright amber eyes!
 def jisu_cap_visor(u,v,layer):
  ang=(u-.5)*math.pi*.84;ca,sa=math.cos(ang),math.sin(ang);taper=math.sin(math.pi*u)**.85
  x=.314*sa+.022*sa*v
  yf=.274*ca+.198*v*taper
  zm=.010-.034*v*taper-.014*(1.0-ca)
  th=.013*(math.sin(math.pi*v)**.55)*(taper**.45)
  return jp_c+jp_r*x+jp_fwd*yf+jp_up*(zm+layer*th)
 for layer in (-1,1):
  b.grid(lambda u,v,layer=layer:jisu_cap_visor(u,v,layer),q(12,20),q(3,5),'cloth','Head',reverse=layer>0,uvfn=lambda u,v:(u,.57+.05*v))
 # Prominent gleaming brass mail-crest badge centered flush on the front crown of the postal head cap!
 def jp_oval(c0,sc,tile,n,m,uvfn=None):
  def fn(u,v,c0=c0,sc=sc):
   a=T*u;phi=math.pi*(.005+.990*v);sp,cp=math.sin(phi),math.cos(phi)
   return c0+jp_r*(sc[0]*sp*math.sin(a))+jp_fwd*(sc[1]*sp*math.cos(a))+jp_up*(sc[2]*cp)
  b.grid(fn,n,m,tile,'Head',True,True,uvfn=uvfn)
 crest_c=jp_c+jp_fwd*.302+jp_up*.126
 jp_oval(crest_c,(.102,.024,.072),'gold',q(10,14),q(5,8),uvfn=lambda u,v:(u,.64+.30*v))
 jp_oval(crest_c+jp_fwd*.019,(.066,.015,.041),'ivory',q(8,12),q(4,6))
 jp_oval(crest_c+jp_fwd*.032,(.019,.011,.019),'gold',q(6,8),q(3,5),uvfn=lambda u,v:(u,.68+.24*v))
 for s in (-1,1):
  jp_oval(crest_c+jp_r*(s*.114)+jp_up*.009,(.048,.017,.024),'gold',q(6,10),q(3,5),uvfn=lambda u,v:(u,.64+.30*v))
 # v39 MIN-14: Cozy terracotta-amber postal satchel belt seated 100% FLUSH into the curved shell whorls
 # with exact 1:1 meridian alignment (q(22,44) matching jisu_shell!) so both edges are razor-clean with zero sawtooth or gap!
 def shell_belt(u,v):
  vv=.65+.06*v
  dr=-.003+.0105*(math.sin(math.pi*v)**.60) if (v<.12 or v>.88) else .0065+.0020*math.sin(math.pi*v)
  return jisu_shell(u,vv,dr)
 b.grid(shell_belt,q(22,44),q(4,6),'gold','Body',True,False,uvfn=lambda u,v:(u,.08+.36*v))
 sat_c=jisu_shell(.50,.68,.048)
 def jisu_sat(u,v):
  a=T*u;phi=math.pi*(.005+.990*v);sp,cp=math.sin(phi),math.cos(phi)
  sx=math.copysign(abs(sp*math.sin(a))**.72,sp*math.sin(a))
  sy=math.copysign(abs(sp*math.cos(a))**.72,sp*math.cos(a))
  sz=math.copysign(abs(cp)**.72,cp)
  return sat_c+Vector((.110*sx,.225*sy,.198*sz))
 b.grid(jisu_sat,q(12,18),q(8,12),'gold','Body',True,False,uvfn=lambda u,v:(u,.06+.40*v))
 b.ellipsoid(sat_c+Vector((-.118,0.0,-.022)),(.026,.046,.046),'gold','Body',q(8,12),q(5,8),uvfn=lambda u,v:(u,.62+.32*v))
 return b.object(mat,rig,'Jisu',ground=True)

# ---------------------------------------------------------------------------
# 6. PIP (Pattern Reef Royal Gramma — v21 Sleek Fish Contour + Fin Rays + Warm Smile M3 Fix)
# ---------------------------------------------------------------------------
PIP_SPINE=[
 (-1.16,1.37,.000,.000,.000),  # 0: graceful tapered tropical reef-fish snout tip
 (-1.07,1.38,.148,.156,.140),  # 1: sleek cute snout & warm upturned smile contour
 (-0.84,1.41,.256,.304,.272),  # 2: sculpted tapered cheeks & forward-angled eyes
 (-0.46,1.40,.304,.422,.380),  # 3: sleek laterally-compressed Royal Gramma shoulders
 (-0.02,1.37,.274,.412,.370),  # 4: violet-to-gold mid-body
 ( 0.44,1.35,.186,.292,.272),  # 5: sleek sunshine-gold rear body
 ( 0.84,1.34,.095,.138,.132),  # 6: slender caudal peduncle
 ( 1.02,1.34,.000,.000,.000),  # 7: closed tail root
]

def _pip_raw(u,v):
 a=T*u;ca,sa=math.cos(a),math.sin(a)
 if v<.070:
  t=.004+.996*(v/.070);vs=.070;sc=math.sin(t*math.pi*.5);off=-.050*math.cos(t*math.pi*.5)
 elif v>.945:
  t=(1.0-v)/.055;vs=.945;sc=math.sin(t*math.pi*.5);off=.055*math.cos(t*math.pi*.5)
 else:
  vs=v;sc=1.0;off=0.0
 y,zc,rx,rzt,rzb=_echo_curve(PIP_SPINE,vs*(len(PIP_SPINE)-1))
 # Streamlined tropical reef-fish tapered ridge & sculpted cheek contour (distinct diamond-almond fish profile, NEVER a vertical egg!).
 keel_pinch=1.0-.24*(ca**2)*math.sin(math.pi*vs)
 cheek_flare=1.0+.11*(sa**2)*math.exp(-((vs-.30)/.14)**2)
 rx=max(0.0,rx)*sc*keel_pinch*cheek_flare
 rzt=max(0.0,rzt)*sc;rzb=max(0.0,rzb)*sc
 rz=rzt*(.5+.5*ca)+rzb*(.5-.5*ca)
 return Vector((rx*sa,y+off,zc+rz*ca))

def pip_nrm(u,v):
 e=1e-3;v0=max(.004,min(.996,v))
 pu=_pip_raw((u+e)%1.0,v0)-_pip_raw((u-e)%1.0,v0)
 pv=_pip_raw(u,min(.998,v0+e))-_pip_raw(u,max(.002,v0-e))
 n=pu.cross(pv)
 if n.length<1e-9:return Vector((0,-1,0)) if v<.5 else Vector((0,1,0))
 return n.normalized()

def pip_surface(u,v,extra=0.0):
 p=_pip_raw(u,v)
 return p+pip_nrm(u,v)*extra if extra else p

def pip_eye(side):
 # v32: Warm living golden-amber reef-fish eyes with ~4.5 deg inward eye-contact convergence!
 c=Vector((side*.246,-.808,1.516));n=Vector((side*.45,-.86,.22)).normalized()
 h=Z.cross(n).normalized();v=n.cross(h).normalized()
 return c,h,v,n

def pip_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 def body_w(p,u,v):
  head=1.0-smooth_w(.28,.46,v);tail=smooth_w(.64,.88,v)
  return {'Head':head,'Body':max(0.0,1.0-head-tail),'Tail':tail}
 b.grid(pip_surface,q(30,54),q(26,46),'skin',body_w,True,False)
 # Large wide-open cheerful 77%-iris golden-amber conforming eyes + graceful swept fluted pectoral & sculpted leaf pelvic fins.
 for s,suf in ((-1,'L'),(1,'R')):
  eye(b,s,q(16,28),q(11,18),pip_eye,.232,pip_surface,'pip',res=(q(30,54),q(26,46)),depth=.105,swell=.042,lid_scale=.85)
  # v28 Minor #5: Smooth high-resolution curved organic tropical reef-fish pectoral fan fins (ZERO jagged sawtooth teeth!).
  def pec(u,v,s=s):
   a=-.94+1.88*u
   # Silky continuous rounded organic paddle-fan margin (zero Nyquist sawtooth notches!)
   fan_arc=.86+.14*(math.sin(math.pi*u)**.52)
   qq=v*fan_arc
   sweep_y=.32+.18*math.cos(a)
   droop=-.07*qq-.03*math.sin(math.pi*u)
   return Vector((s*(.24+qq*.54*math.cos(a)),-.34+qq*sweep_y,1.27+qq*(.27*math.sin(a)+droop)))
  for layer in (-1,1):
   def pec_l(u,v,layer=layer,s=s):
    edge_r=math.sqrt(max(0.0,1.0-(v**10.0)))
    th=(.019*(1.0-.42*v)+.004*math.sin(math.pi*v))*(math.sin(math.pi*u)**.55)*edge_r
    return pec(u,v,s)+Vector((0,0,layer*th))
   b.grid(pec_l,q(20,44),q(5,9),'fin',_limb_w('Body','Pectoral.'+suf,.02,.28),reverse=(s*layer<0),uvfn=lambda u,v:(u,.25+.72*v))
  # Smooth curved tropical ventral pelvic leaf-fins tucked smoothly backward along the lower belly (ZERO sawtooth!).
  def pelvic(u,v,s=s):
   fan=(u-.5)*2.0
   qq=v
   width=(.065+.095*math.sin(math.pi*min(1.0,qq*.92)))*(1.0-.35*(qq**2))
   cx=s*(.065+.075*(qq**.85)+.028*math.sin(math.pi*qq))
   cy=-.24+.48*qq
   cz=1.06-.22*qq+.05*(qq**2)
   return Vector((cx+s*fan*width*.45,cy+fan*width*.35,cz-fan*width*.55))
  for layer in (-1,1):
   def pelv_l(u,v,layer=layer,s=s):
    edge_r=math.sqrt(max(0.0,1.0-(v**10.0)))
    th=.014*(1.0-.48*v)*(math.sin(math.pi*u)**.55)*edge_r
    return pelvic(u,v,s)+Vector((s*layer*th*.85,0,layer*th*.52))
   b.grid(pelv_l,q(14,24),q(5,8),'fin','Body',reverse=(s*layer>0),uvfn=lambda u,v:(u,.22+.74*v))
 # v28 Minor #5 + v38: Smooth ribbon dorsal, anal & tail fins with spine-welded base weights (zero dorsal detachment during swim!).
 def dorsal_w(p,u,v):
  # Match spine bone weights at v=0 (y = -0.58 + 1.44*u -> v_spine ~ 0.27..0.93) and blend smoothly into Dorsal crest!
  v_sp=.27+.66*u
  sw=body_w(p,0.0,v_sp)
  wd=smooth_w(.04,.46,v)
  return {'Head':sw['Head']*(1.0-wd),'Body':sw['Body']*(1.0-wd),'Tail':sw['Tail']*(1.0-wd),'Dorsal':wd}
 def anal_w(p,u,v):
  wt=smooth_w(.55,.95,u)
  return {'Body':1.0-wt,'Tail':wt}
 for layer in (-1,1):
  def dorsal(u,v,layer=layer):
   qq=v
   edge_round=math.sqrt(max(0.0,1.0-(v**10.0)))
   u_seal=math.sin(math.pi*u)**.48
   th=(.042*((1.0-v)**1.55)+.018*(1.0-.28*v))*u_seal*edge_round
   # Gentle silky S-wave across the tall visible crest (zero jagged edge teeth in front.png & quarter.png!)
   wave=(.104*(v**1.15)*math.sin(u*math.pi*2.25+.30)+.024*(v**1.45)*math.sin(v*math.pi*1.15-u*math.pi*1.45))*u_seal
   y=-.58+1.44*u
   z=1.725-.295*(u**1.30)+.04*math.sin(math.pi*u)
   h=(.15+.50*(math.sin(math.pi*u)**.60))*(1.0-.11*u)
   return Vector((wave+layer*th,y+qq*.16,z+qq*h))
  b.grid(dorsal,q(24,56),q(6,11),'fin',dorsal_w,reverse=layer<0)
  def anal(u,v,layer=layer):
   qq=v
   edge_round=math.sqrt(max(0.0,1.0-(v**10.0)))
   th=(.016*(1.0-.42*v)+.004)*(math.sin(math.pi*u)**.55)*edge_round
   wave=-.028*(v**1.25)*math.sin(u*math.pi*1.4)
   y=-.06+.94*u;z=.98+.20*u
   return Vector((wave+layer*th,y+qq*.16,z-qq*(.07+.29*(math.sin(math.pi*u)**.72))))
  b.grid(anal,q(18,36),q(4,8),'fin',anal_w,reverse=layer>0)
  def tail_fin(u,v,layer=layer):
   # Smoothly curved rounded-lobe tropical reef-fish fan/lyre tail (ZERO jagged teeth, ZERO spiky corners!)
   a=-1.06+2.12*u
   lobe_round=.84+.16*(math.sin(math.pi*u)**.32)
   lyre=lobe_round*(1.0+.11*(abs(2.0*u-1.0)**1.6)-.06*math.exp(-((2.0*u-1.0)/.30)**2))
   qq=v
   edge_round=math.sqrt(max(0.0,1.0-(v**10.0)))
   th=(.020*(1.0-.40*v)+.005)*(math.sin(math.pi*u)**.55)*edge_round
   wave=.046*(v**1.30)*math.sin((2.0*u-1.0)*math.pi*.75)
   return Vector((wave+layer*th,.92+qq*(.68*math.cos(a)*lyre+.10),1.34+qq*.68*math.sin(a)*lyre))
  b.grid(tail_fin,q(24,56),q(5,10),'fin','Tail',reverse=layer<0,uvfn=lambda u,v:(u,.58+.40*v))
 # v26 Minor #5: Deepened, slightly thickened (+26%) joyful upturned U-arc happy smile clearly readable even at ~80-95px in 10-patterns!
 def pip_smile_pt(t):
  s=2.0*t-1.0
  vv=.094+.094*(s**2)
  ang=math.pi-s*1.32
  uu=(ang/T)%1.0
  p=pip_surface(uu,vv,.018)
  p.z-=.018*(1.0-s**2)
  return p
 def pip_smile_r(t):
  base=.0245*(.80+.22*math.sin(math.pi*t))
  if t<.12:return base*math.sqrt(max(0.0,1.0-((.12-t)/.12)**2))
  if t>.88:return base*math.sqrt(max(0.0,1.0-((t-.88)/.12)**2))
  return base
 b.tube(pip_smile_pt,pip_smile_r,q(7,10),q(16,22),'dark','Head')
 return b.object(mat,rig,'Pip')

def rig_create(char):
 data=bpy.data.armatures.new(char+' species skeleton');ob=bpy.data.objects.new(char+' rig',data);bpy.context.collection.objects.link(ob);bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 def bone(name,head,tail,parent=None):
  b=data.edit_bones.new(name);b.head=head;b.tail=tail
  if parent:b.parent=data.edit_bones[parent]
 if char=='jisu':
  bone('Root',(0,0,0),(0,0,.25));bone('Body',(0,0,.80),(0,0,1.10),'Root');bone('Head',(0,-.56,.94),(0,-.92,1.06),'Body')
  for s,suf in ((-1,'L'),(1,'R')):
   c,h,v,n=jisu_eye(s);bone('Eye.'+suf,c,c+n*.14,'Head')
   bone('Antenna.'+suf,(s*.31,-.78,1.22),(s*.56,-.82,1.48),'Head')
   bone('Claw.'+suf,(s*.35,-.74,.74),(s*.66,-1.10,.48) if s<0 else (.74,-1.04,.75),'Body')
   for j in range(3):bone('Leg%d.%s'%(j+1,suf),(s*(.30+.02*j),-.40+.24*j,.72),(s*(.73+.09*j),-.48+.28*j,.75+.05*j),'Body')
 elif char=='pip':
  bone('Float',(0,0,0),(0,0,.25));bone('Body',(0,0,1.37),(0,-.35,1.40),'Float');bone('Head',(0,-.35,1.40),(0,-.90,1.41),'Body');bone('Tail',(0,.74,1.34),(0,1.26,1.34),'Body');bone('Dorsal',(0,.06,1.74),(0,.36,2.08),'Body')
  for s,suf in ((-1,'L'),(1,'R')):
   c,h,v,n=pip_eye(s);bone('Eye.'+suf,c,c+n*.16,'Head');bone('Pectoral.'+suf,(s*.24,-.34,1.25),(s*.68,-.02,1.20),'Body')
 elif char=='echo':
  bone('Float',(0,0,0),(0,0,.25))
  bone('Body',(0,0,1.34),(0,-.35,1.44),'Float');bone('Head',(0,-.35,1.44),(0,-.95,1.56),'Body');bone('Tail',(0,.68,1.14),(0,1.24,1.03),'Body')
  for s,suf in ((-1,'L'),(1,'R')):
   c,h,v,n=echo_eye(s);bone('Eye.'+suf,c,c+n*.18,'Head');bone('Fin.'+suf,(s*.45,-.08,1.23),(s*1.05,.20,1.06),'Body')
 elif char=='bok':
  bone('Float',(0,0,0),(0,0,.25))
  bone('Head',(0,0,1.1),(0,0,1.6),'Float');bone('Tail',(0,.66,1.04),(0,1.06,1.04),'Head')
  for s,suf in ((-1,'L'),(1,'R')):
   c,h,v,n=bok_eye(s);bone('Eye.'+suf,c,c+n*.2,'Head');bone('Fin.'+suf,(s*.75,0,1.18),(s*1.07,0,1.18),'Head')
 elif char=='captain-bay':
  bone('Root',(0,0,0),(0,0,.25))
  bone('Torso',(0,0,.52),(0,-.08,1.34),'Root')
  bone('Head',(0,-.16,1.38),(0,-.24,1.94),'Torso')
  bone('Tail',(0,.82,.32),(0,1.62,.10),'Torso')
  for s,suf in ((-1,'L'),(1,'R')):
   c,h,v,n=captain_eye(s);bone('Eye.'+suf,c,c+n*.18,'Head');bone('Fin.'+suf,(s*.64,-.03,.95),(s*1.12,-.52,.10),'Torso')
 else:
  bone('Float',(0,0,0),(0,0,.25))
  bone('Bell',(0,0,1.62),(0,0,2.1),'Float')
  for i in range(4):
   a=T*i/4+.38;bone('Oral.'+str(i),(.18*math.sin(a),-.18*math.cos(a),1.6),(.4*math.sin(a),-.4*math.cos(a),.8),'Bell');bone('Fringe.'+str(i),(.8*math.sin(a),-.66*math.cos(a),1.63),(.8*math.sin(a),-.66*math.cos(a),.9),'Bell')
  for s,suf in ((-1,'L'),(1,'R')):bone('Eye.'+suf,(s*.292,-.732,1.892),(s*.292+s*.05,-.91,1.918),'Bell')
 bpy.ops.object.mode_set(mode='OBJECT');return ob

def animate(rig,char):
 # Lively species-specific motion with anticipation, squash-and-stretch, and phase-delayed secondary motion.
 clips={
 'Idle':[(1,0,0,0,0),(21,.045,1.4,0,-1.5),(38,.065,2.0,6,-1.5),(48,.050,1.2,6,-.5),(67,-.035,-1.6,-3,0),(99,0,0,0,0)],
 'Listen':[(1,0,0,0,0),(10,.025,-2.5,3,-3),(30,.040,-2.5,3,-3),(44,.030,3.0,1,-1.5),(62,.005,.5,0,0),(85,0,0,0,0)],
 'React':[(1,0,0,0,0),(7,-.035,-2.5,-6,-3),(16,.135,6.5,-4,4),(26,.070,2.5,3,1.5),(40,.018,-1.0,0,0),(53,0,0,0,0)]}
 bpy.context.scene.render.fps=30;rig.animation_data_create()
 for name,keys in clips.items():
  if char=='captain-bay':keys=[(round(f*1.2),bob*.38,tilt*.75,gaze*.9,pitch*.85) for f,bob,tilt,gaze,pitch in keys]
  act=bpy.data.actions.new(name);rig.animation_data.action=act
  for f,bob,tilt,gaze,pitch in keys:
   envelope=0 if f in (keys[0][0],keys[-1][0]) else 1
   for bone in rig.pose.bones:
    bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion();bone.location=(0,0,0);bone.scale=(1,1,1)
   root_b='Root' if char in ('jisu','captain-bay') else 'Float'
   root=rig.pose.bones[root_b];root.location=(0,0 if char in ('jisu','captain-bay') else bob,0);root.keyframe_insert('location',frame=f)
   def rotate(n,axis,deg):
    p=rig.pose.bones[n];local=rig.data.bones[n].matrix_local.to_quaternion().inverted()@Vector(axis);p.rotation_quaternion=Quaternion(local,math.radians(deg));p.keyframe_insert('rotation_quaternion',frame=f)
   if char=='jisu':
    # v38 Pixar cohesive full-body breathing + curious tilted head lead + quill follow-through (grounded on Z=0!)
    bd=rig.pose.bones['Body']
    breath_amp=.034 if name=='React' else .020
    sq=1.0+breath_amp*math.sin(f*.14)*envelope
    bd.scale=(sq,1.0/math.sqrt(sq),sq);bd.keyframe_insert('scale',frame=f)
    rotate('Body',(1,0,.22),tilt*.45*envelope)
    p_hd=rig.pose.bones['Head'];inv_hd=rig.data.bones['Head'].matrix_local.to_quaternion().inverted()
    hd_yaw=(5.5 if name=='Listen' else gaze*.50)*envelope
    hd_pit=(pitch*.45+tilt*.22)*envelope
    hd_roll=(2.8 if name=='Listen' else gaze*.22)*envelope
    p_hd.rotation_quaternion=Quaternion(inv_hd@Z,math.radians(hd_yaw))@Quaternion(inv_hd@Vector((1,0,0)),math.radians(hd_pit))@Quaternion(inv_hd@Vector((0,1,0)),math.radians(hd_roll))
    p_hd.keyframe_insert('rotation_quaternion',frame=f)
    for s,suf in ((-1,'L'),(1,'R')):
     p=rig.pose.bones['Eye.'+suf];inv=rig.data.bones[p.name].matrix_local.to_quaternion().inverted();eg=max(-3.,min(3.,gaze*.45));ep=max(-3.,min(3.,pitch*.50));p.rotation_quaternion=Quaternion(inv@Z,math.radians(eg))@Quaternion(inv@Vector((1,0,0)),math.radians(ep));p.keyframe_insert('rotation_quaternion',frame=f)
     rotate('Antenna.'+suf,(0,1,0),s*envelope*(8 if name=='React' else 4)*math.sin(f*.22+s))
     # Right claw waves gripped feather quill cheerfully outward on React, never inward toward face/shell!
     if s>0:rotate('Claw.R',(0,1,0),envelope*(9 if name=='React' else 3.5)*math.sin(f*.20))
     else:rotate('Claw.L',(1,0,0),envelope*(4.5 if name=='React' else 2)*math.sin(f*.18))
     for j in range(3):rotate('Leg%d.%s'%(j+1,suf),(0,1,0),s*envelope*.95*math.sin(f*.14+j*.35))
   elif char=='pip':
    bd=rig.pose.bones['Body'];sq=1+.026*math.sin(f*.18)*envelope;bd.scale=(sq,1/math.sqrt(sq),sq);bd.keyframe_insert('scale',frame=f)
    rotate('Body',(0,1,.18),tilt*.70)
    rotate('Head',(0,0,1),5.0*envelope if name=='Listen' else gaze*.42*envelope)
    rotate('Tail',(0,0,1),envelope*math.sin(f*.22-.6)*(18 if name=='React' else 10))
    rotate('Dorsal',(0,1,0),envelope*math.sin(f*.18)*(8 if name=='React' else 4))
    for s,suf in ((-1,'L'),(1,'R')):
     p=rig.pose.bones['Eye.'+suf];inv=rig.data.bones[p.name].matrix_local.to_quaternion().inverted();eg=max(-3.,min(3.,gaze*.45));ep=max(-3.,min(3.,pitch*.55));p.rotation_quaternion=Quaternion(inv@Z,math.radians(eg))@Quaternion(inv@Vector((1,0,0)),math.radians(ep));p.keyframe_insert('rotation_quaternion',frame=f)
     amp=20 if name=='React' else 9
     rotate('Pectoral.'+suf,(0,1,0),s*envelope*amp*math.sin(f*.24+s))
   elif char=='echo':
    bd=rig.pose.bones['Body']
    sq=1+.026*math.sin(f*.14)*envelope
    bd.scale=(sq,1/math.sqrt(sq),sq);bd.keyframe_insert('scale',frame=f)
    rotate('Body',(1,0,.20),tilt*.75)
    rotate('Head',(0,0,1),4.5*envelope if name=='Listen' else gaze*.45*envelope)
    rotate('Tail',(1,0,0),envelope*math.sin(f*.14-.7)*(16 if name=='React' else 9))
    for s,suf in ((-1,'L'),(1,'R')):
     p=rig.pose.bones['Eye.'+suf];inv=rig.data.bones[p.name].matrix_local.to_quaternion().inverted();eg=max(-3.,min(3.,gaze*.45));ep=max(-3.,min(3.,pitch*.55));p.rotation_quaternion=Quaternion(inv@Z,math.radians(eg))@Quaternion(inv@Vector((1,0,0)),math.radians(ep));p.keyframe_insert('rotation_quaternion',frame=f)
     amp=20 if name=='React' else 8
     rotate('Fin.'+suf,(0,1,0),s*(envelope*amp*math.sin(f*.18+s)+(10*envelope if name=='React' else 0)))
   elif char=='captain-bay':
    # v38: Grounded walrus captain — hearty Torso breathing, expressive independent Head nod/tilt, sleeves track waving Fin.R!
    tr=rig.pose.bones['Torso']
    sq=1.0+(.032 if name=='React' else .022)*math.sin(f*.12)*envelope
    tr.scale=(sq,1.0,1.0/sq);tr.keyframe_insert('scale',frame=f)
    rotate('Torso',(1,0,.22),tilt*.45*envelope)
    p_hd=rig.pose.bones['Head'];inv_hd=rig.data.bones['Head'].matrix_local.to_quaternion().inverted()
    hd_yaw=(5.0 if name=='Listen' else gaze*.45)*envelope
    hd_pit=(pitch*.42+tilt*.38)*envelope
    hd_roll=(3.2 if name=='Listen' else tilt*.20)*envelope
    p_hd.rotation_quaternion=Quaternion(inv_hd@Z,math.radians(hd_yaw))@Quaternion(inv_hd@Vector((1,0,0)),math.radians(hd_pit))@Quaternion(inv_hd@Vector((0,1,0)),math.radians(hd_roll))
    p_hd.keyframe_insert('rotation_quaternion',frame=f)
    rotate('Tail',(0,0,1),tilt*1.4*envelope)
    for s,suf in ((-1,'L'),(1,'R')):
     p=rig.pose.bones['Eye.'+suf];inv=rig.data.bones[p.name].matrix_local.to_quaternion().inverted();eg=max(-3.,min(3.,gaze*.45));ep=max(-3.,min(3.,pitch*.6));p.rotation_quaternion=Quaternion(inv@Z,math.radians(eg))@Quaternion(inv@Vector((1,0,0)),math.radians(ep));p.keyframe_insert('rotation_quaternion',frame=f)
     if name=='React' and s>0:
      rotate('Fin.R',(0,1,0),-24*envelope*math.sin(min(1,f/20)*math.pi))
     else:
      rotate('Fin.'+suf,(0,1,0),s*(envelope*1.4*math.sin(f*.22+s)))
   elif char=='bok':
    hd=rig.pose.bones['Head']
    if name=='React':
     sq=1+.11*math.sin(f*.22)*envelope
     hd.scale=(sq,1/math.sqrt(sq),sq)
    else:
     sq=1+.028*math.sin(f*.14)*envelope
     hd.scale=(sq,1,1/sq)
    hd.keyframe_insert('scale',frame=f)
    rotate('Head',(1,0,.25),tilt);rotate('Tail',(0,0,1),tilt*1.8)
    for s,suf in ((-1,'L'),(1,'R')):
     p=rig.pose.bones['Eye.'+suf];inv=rig.data.bones[p.name].matrix_local.to_quaternion().inverted();eg=max(-3.,min(3.,gaze*.45));ep=max(-3.,min(3.,pitch*.6));p.rotation_quaternion=Quaternion(inv@Z,math.radians(eg))@Quaternion(inv@Vector((1,0,0)),math.radians(ep));p.keyframe_insert('rotation_quaternion',frame=f)
     freq=.62 if name=='React' else .29
     amp=14 if name=='React' else 7
     rotate('Fin.'+suf,(0,1,0),s*(envelope*amp*math.sin(f*freq+s)+tilt*1.8))
   else:
    # Rhythmic bell-pulse propulsion: bell squash/expand + phase-delayed oral/fringe trail.
    bl=rig.pose.bones['Bell']
    pulse=math.sin(f*.16)*envelope
    bl.scale=(1+.08*pulse,1-.06*pulse,1+.08*pulse)
    bl.keyframe_insert('scale',frame=f)
    rotate('Bell',(0,1,.25),tilt*.9)
    for i in range(4):
     rotate('Oral.'+str(i),(0,1,0),envelope*math.sin(f*.085+i*.9-0.6)*6.5+tilt*1.1)
     rotate('Fringe.'+str(i),(1,0,0),envelope*math.sin(f*.085+i*1.4-1.2)*8.0+tilt*.7)
    for s,suf in ((-1,'L'),(1,'R')):rotate('Eye.'+suf,(0,0,1),max(-3.,min(3.,gaze*.35)))
  for c in act.fcurves:
   for k in c.keyframe_points:k.handle_left_type=k.handle_right_type='AUTO_CLAMPED'
  act.use_fake_user=True;rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,act);track.mute=True
 rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)

def stats(path):
 raw=path.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jl]);bn=28+jl
 tris=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives']);imgs=[]
 for im in d['images']:
  bv=d['bufferViews'][im['bufferView']];s=bn+bv.get('byteOffset',0);data=raw[s:s+bv['byteLength']]
  if data.startswith(b'\x89PNG'):w,h=struct.unpack_from('>II',data,16)
  else:
   k=2
   while data[k+1] not in (0xc0,0xc1,0xc2,0xc3):k+=struct.unpack_from('>H',data,k+2)[0]+2
   h,w=struct.unpack_from('>HH',data,k+5)
  imgs.append({'width':w,'height':h,'bytes':len(data),'mime':im['mimeType']})
 clips=[]
 for a in d['animations']:
  clips.append({'name':a['name'],'duration':max(d['accessors'][s['input']]['max'][0] for s in a['samplers']),'animatedBones':sorted({d['nodes'][c['target']['node']]['name'] for c in a['channels']})})
 return {'file':path.name,'bytes':len(raw),'triangles':tris,'meshCount':len(d['meshes']),'primitives':sum(len(m['primitives']) for m in d['meshes']),'materials':len(d['materials']),'bones':len(d['skins'][0]['joints']),'maps':imgs,'clips':clips}

def build(char,lod,out):
 CE.SKIN_MAPS.pop(char,None)
 bpy.ops.wm.read_factory_settings(use_empty=True);mat=lambda:atlas(char,out,2048 if lod=='close' else 1024);rig=rig_create(char);mesh=({'bok':bok_mesh,'hana':hana_mesh,'captain-bay':captain_mesh,'echo':echo_mesh,'jisu':jisu_mesh,'pip':pip_mesh}[char])(lod=='close',mat,rig);animate(rig,char)
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=mesh
 dest=out/f'{char}-{lod}.glb';bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_apply=False,export_image_format='AUTO',export_extras=False,export_yup=True,export_rest_position_armature=True)
 report=stats(dest);(out/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n');assert report['triangles']<=(21000 if lod=='close' else 7500),report;assert report['bytes']<(2000000 if lod=='close' else 850000),report;assert report['primitives']==report['materials']==report['meshCount']==1;assert report['bones']<=16;assert {a['name'] for a in report['clips']}=={'Idle','Listen','React'}
 if lod=='close':
  bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{char}.blend'),compress=True)
 print('SUPPORTING_HOST_REPORT',json.dumps(report),flush=True)

def proof(char,out,lod='close'):
 # Inspect actual exported GLB reimport, not the authoring scene.
 bpy.ops.wm.read_factory_settings(use_empty=True);src=out/f'{char}-{lod}.glb';bpy.ops.import_scene.gltf(filepath=str(src));scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.use_denoising=False;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('Neutral daylight');scene.world.color=(.17,.17,.17);scene.view_settings.view_transform='AgX'
 rig=next(o for o in scene.objects if o.type=='ARMATURE');meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)];mesh=meshes[0]
 # Imported rest pose and material checks plus evaluated positions for every proof view.
 log={'source':str(src),'sourceBytes':src.stat().st_size,'reimportedSkinnedMeshes':len(meshes),'meshName':mesh.name,'vertices':len(mesh.data.vertices),'polygons':len(mesh.data.polygons),'bones':[b.name for b in rig.data.bones],'proofs':[]}
 floor=bpy.data.materials.new('Warm neutral studio');floor.diffuse_color=(.77,.73,.66,1);bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.08 if char=='hana' else .18));bpy.context.object.data.materials.append(floor)
 def area(name,loc,power,size):
  d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler()
 area('Large daylight',(-3,-4,6),500,4);area('Soft fill',(4,-2,3),280,4);area('Rim daylight',(0,3,5),450,3)
 cam=bpy.data.cameras.new('Actual GLB proof');camera=bpy.data.objects.new('Actual GLB proof',cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=3.05 if lod=='close' else 3.65
 actions=list(bpy.data.actions)
 def act(name):
  a=next((a for a in actions if a.name==name or a.name.startswith(name)),None)
  if a:rig.animation_data_create();rig.animation_data.action=a
  return a
 views=[('front',(0,-5,2.5),'Idle',1),('quarter',(3,-5,2.7),'Idle',1),('side',(5,-.05,2.3),'Idle',1),('back',(0,5,2.6),'Idle',1),('reaction',(2.4,-5,2.6),'React',20 if char=='captain-bay' else 15)]
 if lod=='board':
  views=views[:2];scene.render.resolution_x=448;scene.render.resolution_y=448;scene.cycles.samples=12
 for name,pos,clip,frame in views:
  a=act(clip);scene.frame_set(frame);camera.location=pos;camera.rotation_euler=(Vector((0,0,1.24))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'proof-{lod}-{name}.png');bpy.ops.render.render(write_still=True)
  dep=bpy.context.evaluated_depsgraph_get();evaluated=mesh.evaluated_get(dep);coords=[mesh.matrix_world@v.co for v in evaluated.to_mesh().vertices];arr=np.array(coords);evaluated.to_mesh_clear();log['proofs'].append({'view':name,'clip':a.name if a else None,'frame':frame,'boundsMin':arr.min(axis=0).tolist(),'boundsMax':arr.max(axis=0).tolist(),'image':str(out/f'proof-{lod}-{name}.png')})
 (out/f'reimport-{lod}-proof.json').write_text(json.dumps(log,indent=2)+'\n')

def main():
 p=argparse.ArgumentParser();p.add_argument('--character',choices=['bok','hana','captain-bay','echo','jisu','pip'],required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--lod',choices=['board','close','both'],default='both');p.add_argument('--proof',action='store_true');p.add_argument('--proof-only',action='store_true');p.add_argument('--proof-lod',choices=['board','close'],default='close');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True)
 if not a.proof_only:
  for lod in ('board','close') if a.lod=='both' else [a.lod]:build(a.character,lod,a.output)
 if a.proof or a.proof_only:proof(a.character,a.output,a.proof_lod)
if __name__=='__main__':main()
