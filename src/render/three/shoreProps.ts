import type { GroundPoint } from './ShoreProjection';
type P=readonly[number,number];
export type ShoreProp={id:string;source:GroundPoint;foot:GroundPoint;scale?:number;rect?:boolean;points:readonly P[];holes?:readonly(readonly P[])[]};
/** Geometry contains transparent padding; the model-authored alpha supplies
 * the silhouette. Ground anchors remain registered to the existing gameplay. */
export const SHORE_STAGE_PROPS:readonly ShoreProp[]=[
  {id:'gate',source:{x:.177,y:.559},foot:{x:.17,y:.62},scale:.67,rect:true,points:[[.063,.218],[.297,.218],[.297,.57],[.063,.57]]},
  {id:'mural',source:{x:.36,y:.5866},foot:{x:.36,y:.62},rect:true,points:[[.234,.41],[.485,.41],[.485,.596],[.234,.596]]},
  {id:'driftwood',source:{x:.37,y:.7588},foot:{x:.37,y:.75},rect:true,points:[[.25,.678],[.478,.678],[.478,.767],[.25,.767]]},
  {id:'small-stone',source:{x:.18,y:.7407},foot:{x:.18,y:.73},rect:true,points:[[.11,.664],[.237,.664],[.237,.75],[.11,.75]]},
  {id:'spring',source:{x:.60,y:.724},foot:{x:.60,y:.70},rect:true,points:[[.528,.52],[.691,.52],[.691,.738],[.528,.738]]},
  {id:'spring-empty',source:{x:.60,y:.724},foot:{x:.60,y:.70},rect:true,points:[[.528,.52],[.691,.52],[.691,.738],[.528,.738]]},
  {id:'waystone',source:{x:.78,y:.722},foot:{x:.78,y:.72},rect:true,points:[[.645,.421],[.886,.421],[.886,.736],[.645,.736]]},
  {id:'front-rocks',source:{x:.12,y:.985},foot:{x:.12,y:.985},points:[[0,.745],[.245,.745],[.245,.78],[.28,.78],[.28,1],[0,1]]},
];
