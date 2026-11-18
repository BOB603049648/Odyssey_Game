"""Render exported stage geometry in Blender, without browser/UI or Three post.
Run: blender -b --python scripts/render-shore-structure.py -- <input.json> <output.png>
"""
import bpy,json,sys,math
from pathlib import Path
from mathutils import Matrix,Vector

args=sys.argv[sys.argv.index('--')+1:]
source=json.loads(Path(args[0]).read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.cycles.use_denoising=False
scene.render.resolution_x=source['width'];scene.render.resolution_y=source['height'];scene.render.resolution_percentage=75
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(Path(args[1]).resolve())
scene.world.use_nodes=True
ambient=source.get('ambient',['#c6d1d0',2.2])
hex_color=ambient[0].lstrip('#')
srgb=[int(hex_color[i:i+2],16)/255 for i in [0,2,4]]
linear=[c/12.92 if c<.04045 else ((c+.055)/1.055)**2.4 for c in srgb]
background=scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value=(*linear,1);background.inputs['Strength'].default_value=ambient[1]/math.pi
scene.view_settings.view_transform='Standard'

for item in source['meshes']:
    p=item['positions'];uv=item['uv'];indices=item['index']
    vertices=[p[i:i+3] for i in range(0,len(p),3)]
    faces=[indices[i:i+3] for i in range(0,len(indices),3)]
    mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(item['name'],mesh);scene.collection.objects.link(obj)
    if uv:
        layer=mesh.uv_layers.new()
        for polygon in mesh.polygons:
            for loop_index in polygon.loop_indices:
                index=mesh.loops[loop_index].vertex_index
                layer.data[loop_index].uv=(uv[index*2],uv[index*2+1])
    material=bpy.data.materials.new(item['name']);material.use_nodes=True
    nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
    output=nodes.new('ShaderNodeOutputMaterial')
    shader=nodes.new('ShaderNodeBsdfPrincipled') if item['ground'] else nodes.new('ShaderNodeEmission')
    if 'Roughness' in shader.inputs:shader.inputs['Roughness'].default_value=1
    color=item['color'];rgb=tuple(int(color[i:i+2],16)/255 for i in [0,2,4])
    color_input=shader.inputs['Base Color'] if item['ground'] else shader.inputs['Color']
    color_input.default_value=(*rgb,1)
    if item['texture']:
        image=nodes.new('ShaderNodeTexImage');image.image=bpy.data.images.load(item['texture'],check_existing=True);image.extension='EXTEND'
        if item['ground'] and source.get('floorMirror'):
            coord=nodes.new('ShaderNodeTexCoord');split=nodes.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['UV'],split.inputs[0])
            def mathnode(operation,a,b):
                node=nodes.new('ShaderNodeMath');node.operation=operation
                for index,value in enumerate([a,b]):
                    if isinstance(value,(int,float)):node.inputs[index].default_value=value
                    else:links.new(value,node.inputs[index])
                return node.outputs[0]
            edge,span=source['floorMirror']
            reflected=mathnode('ADD',edge,mathnode('MULTIPLY',span,mathnode('PINGPONG',mathnode('DIVIDE',mathnode('SUBTRACT',edge,split.outputs['Y']),span),1)))
            low=mathnode('LESS_THAN',split.outputs['Y'],edge)
            v=mathnode('ADD',mathnode('MULTIPLY',low,reflected),mathnode('MULTIPLY',mathnode('SUBTRACT',1,low),split.outputs['Y']))
            combine=nodes.new('ShaderNodeCombineXYZ');links.new(split.outputs['X'],combine.inputs['X']);links.new(v,combine.inputs['Y']);links.new(combine.outputs[0],image.inputs['Vector'])
        if item.get('tint') and item['tint'] != [1,1,1]:
            multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
            links.new(image.outputs['Color'],multiply.inputs[1]);multiply.inputs[2].default_value=(*item['tint'],1)
            links.new(multiply.outputs[0],color_input)
        else:links.new(image.outputs['Color'],color_input)
        if item.get('mask') or item['transparent']:
            mix=nodes.new('ShaderNodeMixShader');transparent=nodes.new('ShaderNodeBsdfTransparent')
            alpha=image.outputs['Alpha']
            if item.get('alphaTest') and not item.get('mask'):
                cutoff=nodes.new('ShaderNodeMath');cutoff.operation='GREATER_THAN';cutoff.inputs[1].default_value=item['alphaTest'];links.new(alpha,cutoff.inputs[0]);alpha=cutoff.outputs[0]
            if item.get('mask'):
                mask=nodes.new('ShaderNodeTexImage');mask.image=bpy.data.images.load(item['mask'],check_existing=True);mask.extension='EXTEND'
                cutoff=nodes.new('ShaderNodeMath');cutoff.operation='GREATER_THAN';cutoff.inputs[1].default_value=.4;links.new(mask.outputs['Alpha'],cutoff.inputs[0]);alpha=cutoff.outputs[0]
            links.new(alpha,mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(shader.outputs[0],mix.inputs[2]);shader=mix
    elif item['transparent']:
        mix=nodes.new('ShaderNodeMixShader');transparent=nodes.new('ShaderNodeBsdfTransparent')
        mix.inputs[0].default_value=item['opacity'];links.new(transparent.outputs[0],mix.inputs[1]);links.new(shader.outputs[0],mix.inputs[2]);shader=mix
    links.new(shader.outputs[0],output.inputs['Surface']);obj.data.materials.append(material)

camera=bpy.data.cameras.new('Spatial authoring camera');camera.sensor_fit='VERTICAL';camera.sensor_height=32
projection=source['camera']['projection'];camera.lens=16*projection[5]
camera.shift_x=projection[8]/(2*source['width']/source['height']);camera.shift_y=projection[9]/2
obj=bpy.data.objects.new('Camera',camera);scene.collection.objects.link(obj)
m=source['camera']['matrix'];obj.matrix_world=Matrix([m[i:i+4] for i in range(0,16,4)]).transposed();scene.camera=obj
light=bpy.data.lights.new('Sun','SUN');light.energy=source.get('sunIntensity',1.5);light.angle=.08
sun=bpy.data.objects.new('Sun',light);scene.collection.objects.link(sun)
sun.rotation_euler=Vector(source.get('sunDirection',(12,-18,-8))).to_track_quat('-Z','Y').to_euler()
bpy.ops.render.render(write_still=True)
print('Offline spatial structure render written:',scene.render.filepath)
