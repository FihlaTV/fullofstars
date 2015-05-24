window.fullofstars = window.fullofstars || {};


(function() {


    fullofstars.updateViewport = function(window, renderer, camera) {
        var w = window.innerWidth;
        var h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    


    function createCloudGeometryFromBodies(bodies, saturationFactor) {
        // create the particle variables
        var particleCount = bodies.length;
        var particles = new THREE.Geometry();
        var colors = [];
        
        // now create the individual particles
        for (var p = 0; p < particleCount; p++) {
            particle = bodies[p].position;
            // add it to the geometry
            particles.vertices.push(particle);
            var massFactor = bodies[p].mass / fullofstars.MAX_MASS;
            var color = new THREE.Color(1, 0.3 + 0.6 * massFactor, 0.3 + 0.6 * massFactor);
            if(bodies[p].mass > 0.9999*fullofstars.MAX_MASS) { color = new THREE.Color(0,0,0); }
            var hsl = color.getHSL();
            color.setHSL(hsl.h, hsl.s*saturationFactor, hsl.l);
            colors[p] = color;
        }
        particles.colors = colors;
        return particles;
    }


    $(function() {
        var W = 1200;
        var H = 800;

        var renderer = new THREE.WebGLRenderer();
        renderer.setSize( W, H );
        document.body.appendChild(renderer.domElement);
        var scene = new THREE.Scene();

        var camera = new THREE.PerspectiveCamera(
            35,         // Field of view
            W / H,  // Aspect ratio
            .1,         // Near
            10000       // Far
        );
        camera.position.set(-15, 10, 1000);
        camera.lookAt(scene.position);

        fullofstars.updateViewport(window, renderer, camera);
        window.addEventListener('resize', function() {fullofstars.updateViewport(window, renderer, camera)});

        var materials = fullofstars.createAllMaterials();

        var bodies = fullofstars.createGravitySystem(1000);


        var mesh = new THREE.PointCloud( createCloudGeometryFromBodies(bodies, 1.0), materials.bright );
        var meshDust = new THREE.PointCloud( createCloudGeometryFromBodies(bodies, 0.6), materials.dust );
        var meshDebris = new THREE.PointCloud( createCloudGeometryFromBodies(bodies, 0.3), materials.debrisLarge )
        scene.add( mesh );
        //scene.add( meshDust );
        //scene.add( meshDebris );


        var timeScale = 1.0;
        $("body").on("keypress", function(e) {
            console.log(e.which);
            if(e.which == 32) { timeScale = 1.0 - timeScale; }
        });

        function render() {
            renderer.render( scene, camera );
        }

        var lastT = 0.0;
        function update(t) {
            var dt = (t - lastT) * 0.001 * timeScale;
            var useVerletUpdate = true;
            if(useVerletUpdate) {
                // This step updates positions
                for(var i=0, len=bodies.length; i<len; i++) {
                    bodies[i].velocityVerletUpdate(dt, true);
                    mesh.geometry.vertices[i].copy(bodies[i].position);
                }
                // This step updates velocities, so we can reuse forces for next position update (they will be the same because positios did not change)
                fullofstars.applyBruteForceNewtonianGravity(bodies, dt); // One of these should be removable...
                for(var i=0, len=bodies.length; i<len; i++) {
                    var body = bodies[i];
                    body.velocityVerletUpdate(dt, false);
                    body.force.copy(body.prevForce);
                }
            }
            else {
                fullofstars.applyBruteForceNewtonianGravity(bodies, dt);
                for(var i=0, len=bodies.length; i<len; i++) {
                    bodies[i].updateAndResetForce(dt);
                    mesh.geometry.vertices[i].copy(bodies[i].position);
                }
            }
            mesh.geometry.verticesNeedUpdate = true;
            meshDust.geometry.verticesNeedUpdate = true;
            meshDebris.geometry.verticesNeedUpdate = true;

            //mesh.rotation.x += dt*0.003;
            lastT = t;
        };

        function handleAnimationFrame(dt) {
            update(dt);
            render();
            window.requestAnimationFrame(handleAnimationFrame);
        };
        window.requestAnimationFrame(handleAnimationFrame);

    });
})();