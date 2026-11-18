type Point={x:number;y:number};
type Picker={
  pick:(clientX:number,clientY:number)=>Point|null;
  bodyDistance?:(from:Point,to:Point,height:number)=>number;
  velocity?:(at:Point,wish:Point,height:number)=>Point;
};
const views=new WeakMap<HTMLElement,Picker>();
export function registerSpatialView(view:HTMLElement,picker:Picker){views.set(view,picker);return()=>views.delete(view);}
/** Undefined means the standard painted renderer owns pointer mapping. */
export function pickSpatialGround(view:HTMLElement|null,x:number,y:number):Point|null|undefined{return view?views.get(view)?.pick(x,y):undefined;}
export function spatialBodyDistance(view:HTMLElement|null,from:Point,to:Point,height:number){return view?views.get(view)?.bodyDistance?.(from,to,height):undefined;}
export function spatialVelocity(view:HTMLElement|null,at:Point,wish:Point,height:number){return (view?views.get(view)?.velocity?.(at,wish,height):undefined)??wish;}
