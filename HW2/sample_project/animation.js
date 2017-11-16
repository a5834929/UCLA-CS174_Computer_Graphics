// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// no meaningful scenes to draw - you will fill it in (at the bottom of the file) with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes you see drawn are coded, and where to fill in your own code.

"use strict"      // Selects strict javascript
var canvas, canvas_size, shaders, gl = null, g_addrs,          // Global variables
	thrust = vec3(), 	origin = vec3( 0, 0, 0 ), looking = false, prev_time = 0, animate = false, animation_time = 0, gouraud = false, color_normals = false;

// *******************************************************
// IMPORTANT -- Any new variables you define in the shader programs need to be in the list below, so their GPU addresses get retrieved.

var shader_variable_names = [ "camera_transform", "camera_model_transform", "projection_camera_model_transform", "camera_model_transform_normal",
                              "shapeColor", "lightColor", "lightPosition", "attenuation_factor", "ambient", "diffusivity", "shininess", "smoothness", 
                              "animation_time", "COLOR_NORMALS", "GOURAUD", "USE_TEXTURE" ];
   
function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     // Colors are just special vec4s expressed as: ( red, green, blue, opacity )
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( Color( .8,.3,.8,1 ), .1, 1, 1, 40, undefined ) ); }

// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!
var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "station.jpg", "base.jpg", "background.jpg", "planet1.jpg", "water.jpg", "planet6.jpg", "gift1.jpg", "gift2.jpg", "asteroid.png"];

// Planetary Paramters ***********************************
var track = 0, intro = 1;
var cam_origin;
var planet_period = [200, 250, 300, 350, 400, 450, 500, 550];

function RandomDirection(number){
    var direction = [];
    for(var i=0;i<number+3;i++)
        direction[i] = 3*(0.5-Math.random());
    return direction;
}

var rand_direction = RandomDirection(100);

// Materials *********************************************
// *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
// 1st: Color (4 floats in RGBA format), 2nd: Ambient light,        3rd: Diffuse reflectivity
// 4th: Specular reflectivity,           5th: Smoothness exponent,  6th: Texture image.
var sky           = new Material(Color(0,0,0,1),     1,.2,.2, 10,  "background.jpg");
var station       = new Material(Color(.2,.4,1,1),  .4, 1,.5, 100, "station.jpg");
var station_base  = new Material(Color(.1,.1,.1,1),  1, 1, 1, 100, "base.jpg");
var planet1_body  = new Material(Color(1,.7,1,1),   .3,.5, 1, 40,  "planet1.jpg");
var planet1_ring  = new Material(Color(1,0,.3,.8),  .5, 0,.8, 40);
var planet2       = new Material(Color(.6,.2,.7,1), .1, 1, 1, 40);
var planet3       = new Material(Color(1,.7,.3,1),  .1, 1, 1, 40);
var planet4       = new Material(Color(1,1,1,1),    .4, 1,.5, 10);
var planet5_shell = new Material(Color(.8,.8,.7,1), .5,.5, 1, 60);
var planet5_drop1 = new Material(Color(0,.4,1,.5),  .5, 1,.5, 100, "water.jpg");
var planet5_drop2 = new Material(Color(0,.1,1,.6),  .5, 1,.5, 100, "water.jpg");
var planet6_leaf  = new Material(Color(0,0,0,1),    .5,.5, 1, 100, "planet6.jpg");
var planet6_gift1 = new Material(Color(0,0,0,1),     1, 1, 1, 60,  "gift1.jpg");
var planet6_gift2 = new Material(Color(0,0,0,1),     1, 1, 1, 60,  "gift2.jpg");
var planet7_body  = new Material(Color(.8,1,1,1),   .9,.1, 1, 60);
var planet7_hand  = new Material(Color(.5,.7,.9,1), .9,.1,.5, 40);
var planet7_line1 = new Material(Color(0,0,.4,.8),  .9,.1,.5, 40);
var planet7_line2 = new Material(Color(0,.4,.6,.8), .9,.1,.5, 40);
var asteroid      = new Material(Color(1,.4,.1,.8),  1, 1, 1, 80,  "asteroid.png");


// Where the program starts*******************************
window.onload = function init() { var anim = new Animation(); }

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- 
// which OpenGL is told to call upon every time a draw / keyboard / mouse event happens.
function Animation()    // A class.  An example of a displayable object that our class GL_Context can manage.
{
	( function init( self )
	{
		self.context = new GL_Context( "gl-canvas", Color(0,0,0,1));    // Set your background color here
		self.context.register_display_object( self );
		
        shaders = { "Default":         new Shader( "vertex-shader-id", "fragment-shader-id" ), 
                    "Demo_Shader":     new Shader( "vertex-shader-id", "demo-shader-id"     ),
                    "Faked_Bump_Map":  new Shader( "vertex-shader-id", "faked_bump_map_shader_id" ) };
            
	for( var i = 0; i < texture_filenames_to_load.length; i++ )
		initTexture( texture_filenames_to_load[i], true );

    self.fps = 0;
    
    self.mouse = { "from_center": vec2() };
		            
    self.m_strip       = new Old_Square();                // At the beginning of our program, instantiate all shapes we plan to use, 
	self.m_tip         = new Tip( 3, 10 );                // each with only one instance in the graphics card's memory.
    self.m_cylinder    = new Cylindrical_Tube( 10, 10 );   // For example we'll only create one "cube" blueprint in the GPU, but we'll re-use 
    self.m_torus       = new Torus( 100, 100, rotation(90, 1, 0, 0));             // it many times per call to display to get multiple cubes in the scene.
    self.m_sphere      = new Sphere( 20, 20 );
    self.poly          = new N_Polygon( 10 );
    self.m_cone        = new Cone( 10, 10 );
    self.m_capped      = new Capped_Cylinder( 4, 12, rotation(90, 1, 0, 0));
    self.m_prism       = new Prism( 8, 8 );
    self.m_cube        = new Cube();
    self.m_obj         = new Shape_From_File("teapot.obj", scale(.1, .1, .1));
    self.m_sub         = new Subdivision_Sphere( 4, false );
    self.m_axis        = new Axis();

    self.m_stationBase = new Shape_From_File("station_base.obj", scale(8, 8, 8));
    self.m_penta       = new PentagonPrism(0);

    self.m_planet2     = new Shape_From_File("planet2.obj", scale(3, 3, 3));
    self.m_planet3     = new Shape_From_File("planet3.obj", scale(3, 3, 3));
    self.m_triangle    = new Triangle();
    self.m_planet5_up  = new Shape_From_File("planet5_upper.obj", scale(4.5,4.5,4.5));
    self.m_planet5_lw  = new Shape_From_File("planet5_lower.obj", scale(4.5,4.5,4.5));
    self.m_planet7     = new Shape_From_File("planet7.obj", scale(4,4,4));
    self.m_asteroid    = new Shape_From_File("asteroid.obj", scale(1,1,1));


// 1st parameter is our starting camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
	self.graphicsState = new GraphicsState( translation(0, 0,-25), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );
		
		self.context.render();	
	} ) ( this );
	
// *** Mouse controls: ***
    var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.     
    canvas.addEventListener("mouseup",   ( function(self) { return function(e)	{ e = e || window.event;	self.mouse.anchor = undefined;              } } ) (this), false );
    canvas.addEventListener("mousedown", ( function(self) { return function(e)	{ e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
    canvas.addEventListener("mousemove", ( function(self) { return function(e)	{ e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );                                         
    canvas.addEventListener("mouseout",  ( function(self) { return function(e)	{ self.mouse.from_center = vec2(); }; } ) (this), false );        // Stop steering if the mouse leaves the canvas. 
}
  
// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
    if(track==0){
    	shortcut.add( "x", function() { thrust[1] = -5; } );	shortcut.add( "x", function() { thrust[1] = 0; }, {'type':'keyup'} );
    	shortcut.add( "z", function() { thrust[1] =  5; } );	shortcut.add( "z", function() { thrust[1] = 0; }, {'type':'keyup'} );
    	shortcut.add( "w", function() { thrust[2] =  5; } );	shortcut.add( "w", function() { thrust[2] = 0; }, {'type':'keyup'} );
    	shortcut.add( "a", function() { thrust[0] =  5; } );	shortcut.add( "a", function() { thrust[0] = 0; }, {'type':'keyup'} );
    	shortcut.add( "s", function() { thrust[2] = -5; } );	shortcut.add( "s", function() { thrust[2] = 0; }, {'type':'keyup'} );
    	shortcut.add( "d", function() { thrust[0] = -5; } );	shortcut.add( "d", function() { thrust[0] = 0; }, {'type':'keyup'} );
    }
	// shortcut.add( "f",     function() { looking = !looking; } );
	// shortcut.add( ",",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 1, 0 ), self.graphicsState.camera_transform ); } } ) (this) ) ;
	// shortcut.add( ".",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0,-1, 0 ), self.graphicsState.camera_transform ); } } ) (this) ) ;
 //    shortcut.add( "o",   ( function(self) { return function() { origin = vec3( mult_vec( inverse( self.graphicsState.camera_transform ), vec4(0,0,0,1) )                ); } } ) (this) ) ;
	// shortcut.add( "r",   ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud; } );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	// shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; }; } ) (this) );
	// shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; }; } ) (this) );	
    shortcut.add( "0", function() { track = 0; } );
    shortcut.add( "1", function() { track = 1; } );
    shortcut.add( "2", function() { track = 2; } );
    shortcut.add( "3", function() { track = 3; } );
    shortcut.add( "4", function() { track = 4; } );
    shortcut.add( "5", function() { track = 5; } );
    shortcut.add( "6", function() { track = 6; } );
    shortcut.add( "7", function() { track = 7; } );
}

Animation.prototype.update_strings = function( debug_screen_strings )	      // Strings that this displayable object (Animation) contributes to the UI:	
{
	debug_screen_strings.string_map["time"]    = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
    debug_screen_strings.string_map["fps"] = "Frame Rate: " + Math.floor(this.fps) + " fps";
}

function update_camera( self, animation_delta_time )
{
	var leeway = 70,  degrees_per_frame = .0004 * animation_delta_time,
                      meters_per_frame  = .01 * animation_delta_time;
									
    if( self.mouse.anchor ) // Dragging mode: Is a mouse drag occurring?
    {
        var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
        if( length( dragging_vector ) > 0 )
        self.graphicsState.camera_transform = mult( self.graphicsState.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
            mult( translation(origin),                                                      
            mult( rotation( .01 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ), 
            translation(scale_vec( -1,origin ) ) ) ) );
    }   
    // Flyaround mode:  Determine camera rotation movement first
	var movement_plus  = [ self.mouse.from_center[0] + leeway, self.mouse.from_center[1] + leeway ];  // mouse_from_center[] is mouse position relative to canvas center;
	var movement_minus = [ self.mouse.from_center[0] - leeway, self.mouse.from_center[1] - leeway ];  // leeway is a tolerance from the center before it starts moving.
	
	for( var i = 0; looking && i < 2; i++ )			// Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
	{
		var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
		self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
	}
	self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
}

Animation.prototype.drawSky = function(model_transform){
    this.m_cube.draw( this.graphicsState, mult(model_transform, scale(1200, 1200, 1200)), sky);
    return model_transform;
}

Animation.prototype.drawStation = function(model_transform){
    model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/30, 0, 1, 0));
    this.m_stationBase.draw(this.graphicsState, model_transform, station_base);

    model_transform = mult(model_transform, translation(0, 6, 0));
    this.m_penta.draw(this.graphicsState, mult(model_transform, scale(4,4,4)), station);
    
    return model_transform;
}

Animation.prototype.drawPlanet1 = function(model_transform){
    var planet_basis = model_transform;
    var final_transform;
    
    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[0], 0, 1, 0));
    model_transform = mult(model_transform, translation(30, Math.sin(2*Math.PI*this.graphicsState.animation_time/3000), 0));
    shaders[ "Faked_Bump_Map" ].activate();
    this.m_sub.draw(this.graphicsState, mult(model_transform, scale(3,3,3)), planet1_body);
    shaders[ "Default" ].activate();
    final_transform = model_transform;

    for(var i=0;i<4;i++){
        model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[0], 0, 1, 0));
        model_transform = mult(model_transform, translation(30+Math.cos(2*Math.PI*this.graphicsState.animation_time/planet_period[i]/50), Math.sin(2*Math.PI*this.graphicsState.animation_time/3000), 0));
        model_transform = mult(model_transform, rotation(i*45, 0, 0, 1));
        model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/50, 0, 0, 1));
        this.m_torus.draw(this.graphicsState, model_transform, planet1_ring);
    }
    
    return final_transform;
}

Animation.prototype.drawPlanet2 = function(model_transform){
    var planet_basis = model_transform;
    var final_transform;
    
    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[1], 0, 1, 0));
    model_transform = mult(model_transform, translation(-40, Math.sin(2*Math.PI*this.graphicsState.animation_time/3000), 0));
    model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/40, 1, 0, 1));
    this.m_planet2.draw(this.graphicsState, model_transform, planet2);  
    final_transform= model_transform;

    return final_transform;
}

Animation.prototype.drawPlanet3 = function(model_transform){
    var planet_basis = model_transform;
    var final_transform;

    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[2], 0, 1, 0));
    model_transform = mult(model_transform, translation(0, Math.sin(2*Math.PI*this.graphicsState.animation_time/3000), 50));
    model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/40, 1, 1, 1));
    this.m_planet3.draw(this.graphicsState, model_transform, planet3);  
    final_transform = model_transform;

    return final_transform;
}

Animation.prototype.drawPlanet4 = function(model_transform){
    var planet_basis = model_transform;
    var final_transform;

    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[3], 0, 1, 0));
    model_transform = mult(model_transform, translation(0, 0, -60));
    this.m_sub.draw(this.graphicsState, mult(model_transform, scale(1.5,1.5,1.5)), planet4);
    final_transform = model_transform;

    for(var j=0;j<100;j++){
        for(var i=1;i>-2;i-=2){
            model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[3], 0, 1, 0));
            model_transform = mult(model_transform, translation(0, 0, -60));
            model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/3, rand_direction[j+2], rand_direction[j+1], rand_direction[j]));
            model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/7, rand_direction[j], rand_direction[j+2], rand_direction[j+1]));
            model_transform = mult(model_transform, rotation(-i*50*Math.sin(2*Math.PI*this.graphicsState.animation_time/500), 1, 0, 0));
            model_transform = mult(model_transform, translation(rand_direction[j]*2,rand_direction[j+1]*2,rand_direction[j+2]*2));
            model_transform = mult(model_transform, rotation(45, 0, 0, 1));
            this.m_triangle.draw(this.graphicsState, mult(model_transform, scale(i/2,i/2,1/2)), new Material(Color(Math.random(),Math.random(),Math.random(),Math.random()),1,1,1,40));
        }
    }

    return final_transform;
}

Animation.prototype.drawPlanet5 = function(model_transform){
    var planet_basis = model_transform;
    var final_transform;

    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[4], 0, 1, 0));
    model_transform = mult(model_transform, translation(70, 0, 0));
    this.m_planet5_up.draw(this.graphicsState, model_transform, planet5_shell);
    this.m_planet5_lw.draw(this.graphicsState, model_transform, planet5_shell);
    final_transform = model_transform;

    model_transform = mult(model_transform, translation(0,-3.2,0));
    model_transform = mult(model_transform, rotation(Math.sin(2*Math.PI*this.graphicsState.animation_time/2000), 0,0,1));
    this.poly.draw(this.graphicsState, mult(model_transform, scale(3,1,3)), planet5_drop1);
    
    var T = [5000, 7000, 4500, 8200];
    var x_offset = [2, -1, 0, 0];
    var z_offset = [0,  3,-2, 1];
    var y_threshold = [6, 6, 7, 7];
    var M = [planet5_drop1, planet5_drop2];
    var S = [.5, .2, .4, .3];

    // drops
    for(var i=0;i<4;i++){
        var period = 2*Math.PI*this.graphicsState.animation_time/T[i];
        model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[4], 0, 1, 0));
        model_transform = mult(model_transform, translation(70+x_offset[i],3-Math.tan(period),z_offset[i]));
        if(0<Math.tan(period) && Math.tan(period)<y_threshold[i])
            this.m_sub.draw(this.graphicsState, mult(model_transform, scale(S[i]*Math.sin(period), S[i]*Math.sin(period), S[i]*Math.sin(period))), M[Math.floor(i/2)]);
    }

    return final_transform;
}

Animation.prototype.drawPlanet6 = function(model_transform){
    var planet_basis = model_transform;
    var final_transform;

    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[5], 0, 1, 0));
    model_transform = mult(model_transform, translation(-90, Math.sin(2*Math.PI*this.graphicsState.animation_time/4000), 0));
    model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/planet_period[5], 1, 0, 0));
    this.m_sub.draw(this.graphicsState, mult(model_transform, scale(5,5,5)), planet6_leaf);
    final_transform = model_transform;

    model_transform = mult(final_transform, rotation(this.graphicsState.animation_time/50, 0, 1, 0));
    model_transform = mult(model_transform, translation(7,0,0));
    this.m_cube.draw(this.graphicsState, mult(model_transform, scale(1.5,1.5,1.5)), planet6_gift2);

    model_transform = mult(model_transform, translation(0,.5,0));
    this.m_cube.draw(this.graphicsState, mult(model_transform, scale(1.7,.8,1.7)), planet6_gift1);

    var bulb = [Color(1,.3,0,1), Color(1,1,.3,1), Color(.1,.8,1,1)];

    for(var i=75, j=0;i>=0;i-=3, j+=7){
        model_transform = mult(final_transform, translation(5*Math.cos(i)*Math.sin(j), 5*Math.sin(i)*Math.sin(j), 5*Math.cos(j)));
        this.m_sub.draw(this.graphicsState, mult(model_transform, scale(.2,.2,.2)), new Material(bulb[j%3], Math.random(),Math.random(),Math.random(),100*Math.random()));
        model_transform = mult(final_transform, translation(-5*Math.cos(i)*Math.sin(j), -5*Math.sin(i)*Math.sin(j), -5*Math.cos(j)));
        this.m_sub.draw(this.graphicsState, mult(model_transform, scale(.2,.2,.2)), new Material(bulb[j%3], Math.random(),Math.random(),Math.random(),100*Math.random()));
    }

    return final_transform;
}  

Animation.prototype.drawPlanet7 = function(model_transform){
    var planet_basis = model_transform;
    var deg;
    var final_transform;

    model_transform = mult(planet_basis, rotation(this.graphicsState.animation_time/planet_period[7], 0, 1, 0));
    model_transform = mult(model_transform, translation(0, Math.sin(2*Math.PI*this.graphicsState.animation_time/4500), -100));
    this.m_sub.draw(this.graphicsState, mult(model_transform, scale(3.5,3.5,3.5)), planet7_body);
    final_transform = model_transform;

    for(var i=0;i<15;i++){
        model_transform = mult(final_transform, rotation(24*i, 0, 0, 1));
        model_transform = mult(model_transform, translation(2.5, 0, 0));
        if(i%3) this.m_cube.draw(this.graphicsState, mult(model_transform, scale(2,.2,1)), planet7_line2);
        else    this.m_cube.draw(this.graphicsState, mult(model_transform, scale(2,.2,2)), planet7_line1);
    }

    deg = Math.round(this.graphicsState.animation_time/1000);
    model_transform = mult(final_transform, rotation(24*deg, 0, 0, 1));
    this.m_planet7.draw(this.graphicsState, model_transform, planet7_hand);

    return final_transform;
}

Animation.prototype.drawAsteroid = function(model_transform){
    var asteroid_basis = model_transform;
    var sc = Math.abs(Math.sin(2*Math.PI*this.graphicsState.animation_time/(20*Math.random())))/5;

    model_transform = mult(asteroid_basis, rotation(10, 0, 0, 1));
    model_transform = mult(model_transform, translation(80+100*Math.cos(2*Math.PI*this.graphicsState.animation_time/50000), 0, 30*Math.sin(2*Math.PI*this.graphicsState.animation_time/50000)));
    model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/5, 1,1,1));
    this.m_asteroid.draw(this.graphicsState, mult(model_transform, scale(.2+sc,.2+sc,.2+sc)), asteroid);  

    return model_transform;
}
    
// *******************************************************	
// display(): Called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time){  
	if(!time) time = 0;                                                               // Animate shapes based upon how much measured real time has transpired
	this.animation_delta_time = time - prev_time;                                     // by using animation_time
	if( animate ) this.graphicsState.animation_time += this.animation_delta_time;
	prev_time = time;

    this.fps = 1000/this.animation_delta_time;
	
	update_camera( this, this.animation_delta_time );
		
	var model_transform = mat4();	          // Reset this every frame.
	this.basis_id = 0;	                      // For the "axis" shape.  This variable uniquely marks each axis we draw in display() as it counts them up.
    
    shaders[ "Default" ].activate();                         // Keep the flags seen by the default shader program up-to-date

	gl.uniform1i( g_addrs.GOURAUD_loc, gouraud );		
    gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);    
    
    // *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
    // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
    this.graphicsState.lights = [];                    // First clear the light list each frame so we can replace & update lights.
    
    var light_orbit = [ Math.cos(this.graphicsState.animation_time/4700), Math.sin(this.graphicsState.animation_time/3100) ];
    this.graphicsState.lights.push( new Light( vec4(  30 * light_orbit[0],  30*light_orbit[1],  34 * light_orbit[0], 1 ), Color( 1, 1, 1, 1 ), 10000 ) );
    this.graphicsState.lights.push( new Light( vec4( -10 * light_orbit[0], -20*light_orbit[1], -14 * light_orbit[0], 0 ), Color( 1, 1, 1, 1 ), 100000 ) );
     
	/**********************************
	Start coding down here!!!!
	**********************************/

    var cam_coord;
    var cam_move;
    var target_coord;
    var general_basis = mult(model_transform, translation(0, -10, -30));
    var transform_array = [];

    model_transform = this.drawSky(general_basis);
    model_transform = this.drawStation(general_basis);

    // intro = 1;
    if(2000<time && time<6000){
        intro = 1;
        cam_origin = vec3(mult_vec(inverse(this.graphicsState.camera_transform), vec4(0,0,0,1)));
        this.graphicsState.camera_transform = lookAt(add(cam_origin, vec3(0, time*.00005, time*.0005)), origin, vec3(0,1,0));
    }

    if(track==0 && intro==0){
        cam_coord = vec3(mult_vec(inverse(this.graphicsState.camera_transform), vec4(0,0,0,1)));
        target_coord = add(cam_coord, vec3(0,-5,-20));
        cam_move = normalize(subtract(cam_origin, cam_coord));

        if(target_coord[2]<80)
            this.graphicsState.camera_transform = lookAt(add(cam_coord, cam_move), target_coord, vec3(0,1,0));
        else 
            intro = 1;
    }

    model_transform = this.drawPlanet1(general_basis);
    transform_array.push(model_transform);
    model_transform = this.drawPlanet2(general_basis);
    transform_array.push(model_transform);
    model_transform = this.drawPlanet3(general_basis);
    transform_array.push(model_transform);
    model_transform = this.drawPlanet4(general_basis);
    transform_array.push(model_transform);
    model_transform = this.drawPlanet5(general_basis);
    transform_array.push(model_transform);
    model_transform = this.drawPlanet6(general_basis);
    transform_array.push(model_transform);
    model_transform = this.drawPlanet7(general_basis);
    transform_array.push(model_transform);
    
    if(track!=0 && time>6000){
        target_coord = vec3(mult_vec(transform_array[track-1], vec4(0,0,0,1)));
        this.graphicsState.camera_transform = lookAt(add(target_coord, vec3(0,5,20)), target_coord, vec3(0,1,0));  
        intro = 0;  
    }

    model_transform = this.drawAsteroid(general_basis);

}








