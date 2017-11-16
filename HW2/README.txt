CS174A Assignment2 

Animation Summary:
	Departing from a space station, you're inside a galaxy where peculiar planets reside. Fly around the galazy and take a closer look at each planet. Watch out for the occasional asteroid revolving in an elliptic orbit.

Controls:
	a,d: move along x-axis (not applicable when tracking planets)
	w,s: move along z-axis (not applicable when tracking planets)
	z,x: move along y-axis (not applicable when tracking planets)
	1-7: track each planet closely
	0  : move the camera back to the overview of galaxy

Requirements:
	Hierarchical Objects:
		- the space station
		- planets 1, 4, 5, 6, 7

	Custom Polygon & Discontinuous Edges:
		The pentagonal prism of the space station is a custom shape. At lines 149-196 in Custom_Shapes.js, I specified all the vertices and the normals of each triangular part. Smooth shading is provided by changing the parameter of line 98 to 0.

	Texture Mapped Object:
		- the space station
		- planets 1, 5, 6
		- asteroid
		- background



