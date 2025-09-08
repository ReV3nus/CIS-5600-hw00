#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

// magma params
out vec4 fs_wPos;
out vec4 fs_mPos;

uniform float u_Time;
uniform float u_CubeSize;

uniform float u_WaveSpeed;
uniform float u_WaveAmpl;

float rdm(vec3 p)
{
    float res = p.x + p.y + p.z;
    return res;
}
void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation


    // Surface Displacement
    fs_mPos = vs_Pos;
    float halfSize = u_CubeSize / 2.0;
    vec3 dir = vec3(int(abs(fs_mPos.x) == halfSize),
                    int(abs(fs_mPos.y) == halfSize), 
                    int(abs(fs_mPos.z) == halfSize));

    if(length(dir) < 1.5)
    {
        float disp = halfSize * u_WaveAmpl * sin(u_Time * u_WaveSpeed + rdm(vec3(fs_mPos)));
        fs_mPos.xyz += disp * dir;
        if(disp < 0. && length(dir) > 1.)
        {
            fs_mPos.xyz -= disp * dir;
        }
    }

    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.

    fs_wPos = u_Model * fs_mPos;
    

    gl_Position = u_ViewProj * fs_mPos;

}
