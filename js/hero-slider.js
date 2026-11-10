(function () {
  "use strict";

  var slider = document.querySelector("[data-hero-slider]");
  if (!slider) return;
  slider.classList.add("is-loading");

  var canvas = slider.querySelector("[data-hero-canvas]");
  var slides = Array.from(slider.querySelectorAll("[data-slide]"));
  var indicators = Array.from(slider.querySelectorAll("[data-hero-indicator]"));
  var sceneSlides = [0, 1, 2, 2, 0];
  var status = slider.querySelector("[data-hero-status]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = 0;
  var transitioning = false;
  var pendingIndex = null;
  var timer = 0;
  var transitionFrame = 0;
  var dueAt = 0;
  var remaining = 6000;
  var pauseReasons = new Set();
  var duration = 2000;
  var sceneState = null;
  var pointer = { x: 0, y: 0 };

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function wrapWords() {
    slides.forEach(function (slide) {
      var heading = slide.querySelector(".hero-title");
      if (!heading || heading.dataset.wordsReady) return;
      heading.dataset.wordsReady = "true";
      Array.from(heading.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          var fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              fragment.appendChild(document.createTextNode(part));
            } else {
              var word = document.createElement("span");
              word.className = "word";
              word.style.setProperty("--word-index", String(heading.querySelectorAll(".word").length));
              word.textContent = part;
              fragment.appendChild(word);
            }
          });
          node.replaceWith(fragment);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "EM") {
          var word = document.createElement("span");
          word.className = "word";
          word.style.setProperty("--word-index", String(heading.querySelectorAll(".word").length));
          word.appendChild(node.cloneNode(true));
          node.replaceWith(word);
        }
      });
    });
  }

  function setActiveSlide(index) {
    current = index;
    slider.dataset.currentSlide = String(index);
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.inert = !active;
    });
    indicators.forEach(function (indicator, i) {
      var active = i === index;
      indicator.classList.toggle("is-active", active);
      indicator.classList.remove("is-paused");
      indicator.setAttribute("aria-current", active ? "true" : "false");
    });
    var count = slider.querySelector("[data-hero-count]");
    if (count) {
      count.innerHTML = "0" + (index + 1) + " <i>/</i> " +
        String(slides.length).padStart(2, "0");
    }
  }

  function updateProgress() {
    indicators.forEach(function (indicator) {
      indicator.classList.toggle("is-paused", pauseReasons.size > 0);
    });
  }

  function clearAutoplay() {
    window.clearTimeout(timer);
    timer = 0;
  }

  function scheduleAutoplay(delay) {
    clearAutoplay();
    if (reducedMotion.matches || pauseReasons.size || transitioning) return;
    remaining = delay;
    dueAt = performance.now() + delay;
    timer = window.setTimeout(function () {
      beginTransition((current + 1) % slides.length);
    }, delay);
  }

  function pause(reason) {
    if (pauseReasons.has(reason)) return;
    if (!pauseReasons.size && timer) {
      remaining = Math.max(0, dueAt - performance.now());
      clearAutoplay();
    }
    pauseReasons.add(reason);
    updateProgress();
  }

  function resume(reason) {
    if (!pauseReasons.delete(reason)) return;
    updateProgress();
    if (!pauseReasons.size && !transitioning && !reducedMotion.matches) {
      scheduleAutoplay(remaining || 6000);
    }
  }

  function bezierEase(t) {
    var x1 = 0.22;
    var y1 = 1;
    var x2 = 0.36;
    var y2 = 1;
    var low = 0;
    var high = 1;
    var parameter = t;
    for (var i = 0; i < 12; i += 1) {
      var x = 3 * (1 - parameter) * (1 - parameter) * parameter * x1 +
        3 * (1 - parameter) * parameter * parameter * x2 +
        parameter * parameter * parameter;
      if (Math.abs(x - t) < 0.0001) break;
      if (x < t) low = parameter;
      else high = parameter;
      parameter = (low + high) / 2;
    }
    return 3 * (1 - parameter) * (1 - parameter) * parameter * y1 +
      3 * (1 - parameter) * parameter * parameter * y2 +
      parameter * parameter * parameter;
  }

  function beginTransition(target) {
    if (target === current && !transitioning) return;
    if (transitioning) {
      pendingIndex = target;
      return;
    }

    clearAutoplay();
    transitioning = true;
    pendingIndex = null;
    duration = reducedMotion.matches ? 420 : 2000;
    slider.classList.add("is-transitioning");

    var from = current;
    var startedAt = performance.now();
    var incoming = false;
    var outgoing = false;

    if (sceneState) {
      sceneState.startTransition(sceneSlides[from], sceneSlides[target], reducedMotion.matches);
    }

    function tick(now) {
      var raw = Math.min(1, (now - startedAt) / duration);
      var eased = bezierEase(raw);
      if (sceneState) sceneState.updateTransition(eased, raw, reducedMotion.matches);

      if (reducedMotion.matches) {
        if (!incoming) {
          incoming = true;
          slides[from].classList.add("is-leaving");
          setActiveSlide(target);
        }
      } else {
        if (!outgoing && raw >= 0.3) {
          outgoing = true;
          slides[from].classList.add("is-leaving");
          slides[from].setAttribute("aria-hidden", "true");
        }
        if (!incoming && raw >= 0.6) {
          incoming = true;
          setActiveSlide(target);
        }
      }

      if (raw < 1) {
        transitionFrame = window.requestAnimationFrame(tick);
        return;
      }

      if (!incoming) setActiveSlide(target);
      if (sceneState) sceneState.finishTransition(sceneSlides[target]);
      slides.forEach(function (slide) { slide.classList.remove("is-leaving"); });
      slider.classList.remove("is-transitioning");
      transitioning = false;
      remaining = 6000;
      updateProgress();

      if (pendingIndex !== null && pendingIndex !== current) {
        var queued = pendingIndex;
        pendingIndex = null;
        beginTransition(queued);
      } else {
        pendingIndex = null;
        scheduleAutoplay(6000);
      }
    }

    transitionFrame = window.requestAnimationFrame(tick);
  }

  function onReducedMotionChange() {
    clearAutoplay();
    if (reducedMotion.matches) {
      slider.classList.add("is-reduced");
      pauseReasons.add("reduced-motion");
      if (sceneState) sceneState.setReducedMotion(true);
    } else {
      slider.classList.remove("is-reduced");
      pauseReasons.delete("reduced-motion");
      if (sceneState) sceneState.setReducedMotion(false);
      if (!pauseReasons.size && !transitioning) scheduleAutoplay(6000);
    }
    updateProgress();
  }

  function bindControls() {
    slider.addEventListener("scroll", function () {
      if (slider.scrollLeft !== 0) slider.scrollLeft = 0;
    }, { passive: true });

    slider.querySelector("[data-hero-prev]").addEventListener("click", function () {
      beginTransition((current + slides.length - 1) % slides.length);
    });
    slider.querySelector("[data-hero-next]").addEventListener("click", function () {
      beginTransition((current + 1) % slides.length);
    });
    indicators.forEach(function (button) {
      button.addEventListener("click", function () {
        beginTransition(Number(button.dataset.heroIndicator));
      });
    });
    slider.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        beginTransition((current + 1) % slides.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        beginTransition((current + slides.length - 1) % slides.length);
      }
    });

    slider.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" || event.target.closest("button, a")) return;
      pointer.startX = event.clientX;
      pointer.startY = event.clientY;
    });
    slider.addEventListener("pointerup", function (event) {
      if (pointer.startX === undefined) return;
      var deltaX = event.clientX - pointer.startX;
      var deltaY = event.clientY - pointer.startY;
      pointer.startX = undefined;
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      beginTransition((current + (deltaX < 0 ? 1 : slides.length - 1)) % slides.length);
    });
    slider.addEventListener("pointercancel", function () {
      pointer.startX = undefined;
    });

    slider.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") pause("hover");
    });
    slider.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") resume("hover");
    });
    slider.addEventListener("focusin", function () { pause("focus"); });
    slider.addEventListener("focusout", function (event) {
      if (!slider.contains(event.relatedTarget)) resume("focus");
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause("hidden");
      else resume("hidden");
    });
    reducedMotion.addEventListener("change", onReducedMotionChange);
  }

  function fail(error) {
    slider.classList.remove("is-loading");
    slider.classList.add("is-fallback", "is-ready");
    setStatus("The animated artwork could not be loaded. You can still explore all five highlights.");
    console.error("Phoenix hero 3D scene failed to initialize:", error);
    if (!reducedMotion.matches && !pauseReasons.size) scheduleAutoplay(6000);
  }

  function createScene(THREE) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(slider.clientWidth, slider.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    var scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffe6a0, 0x240d10, 1.5));
    var keyLight = new THREE.PointLight(0xffd21f, 30, 18);
    keyLight.position.set(1.4, 2.2, 4.5);
    scene.add(keyLight);
    var rimLight = new THREE.PointLight(0xed2939, 18, 12);
    rimLight.position.set(2.6, -1.2, -2.5);
    scene.add(rimLight);
    var camera = new THREE.PerspectiveCamera(36, slider.clientWidth / slider.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 10.2);
    var cameraBaseZ = 10.2;
    var stage = new THREE.Group();
    scene.add(stage);

    var orbitalCenterpiece = createHeroOrbit(THREE);
    orbitalCenterpiece.position.set(1.18, 0, -1.15);
    stage.add(orbitalCenterpiece);

    var targets = [buildPhoenixTargets(), buildAtomTargets(), buildLaurelTargets()];
    var geometry = new THREE.BufferGeometry();
    var wingData = targets.map(function (target) { return target.wing; });
    geometry.setAttribute("position", new THREE.BufferAttribute(targets[0].positions, 3));
    geometry.setAttribute("aFrom", new THREE.BufferAttribute(targets[0].positions, 3));
    geometry.setAttribute("aTo", new THREE.BufferAttribute(targets[0].positions, 3));
    geometry.setAttribute("aColorFrom", new THREE.BufferAttribute(targets[0].colors, 3));
    geometry.setAttribute("aColorTo", new THREE.BufferAttribute(targets[0].colors, 3));
    geometry.setAttribute("aWingFrom", new THREE.BufferAttribute(wingData[0], 1));
    geometry.setAttribute("aWingTo", new THREE.BufferAttribute(wingData[0], 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(1.18, 0, 0), 5.5);

    var particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uBurst: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uPointSize: { value: 30 },
        uOpacity: { value: 1 }
      },
      vertexShader: [
        "attribute vec3 aFrom;",
        "attribute vec3 aTo;",
        "attribute vec3 aColorFrom;",
        "attribute vec3 aColorTo;",
        "attribute float aWingFrom;",
        "attribute float aWingTo;",
        "uniform float uProgress;",
        "uniform float uBurst;",
        "uniform float uTime;",
        "uniform float uPixelRatio;",
        "uniform float uPointSize;",
        "varying vec3 vColor;",
        "varying float vAlpha;",
        "void main() {",
        "  vec3 p = mix(aFrom, aTo, uProgress);",
        "  float wing = mix(aWingFrom, aWingTo, uProgress);",
        "  p.y += sin(uTime * 1.15 + abs(p.x) * 1.7) * wing * abs(p.x) * 0.055;",
        "  float phaseX = p.y * 2.4 + uTime;",
        "  float phaseY = p.z * 2.7 - uTime * 0.7;",
        "  float phaseZ = p.x * 2.2 + p.y * 1.3 + uTime * 0.4;",
        "  vec3 flow = vec3(1.3 * cos(phaseZ) - 2.7 * cos(phaseY), -2.2 * cos(phaseZ), -2.4 * cos(phaseX));",
        "  vec3 outward = normalize(p + vec3(0.001));",
        "  p += (outward * 0.72 + flow * 0.62) * uBurst;",
        "  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);",
        "  gl_Position = projectionMatrix * mvPosition;",
        "  gl_PointSize = uPointSize * uPixelRatio * (0.72 + 0.42 * sin(aFrom.x * 19.0 + aFrom.y * 13.0)) / max(2.0, -mvPosition.z);",
        "  vColor = mix(aColorFrom, aColorTo, uProgress);",
        "  vAlpha = 1.0 - uBurst * 0.22;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uOpacity;",
        "varying vec3 vColor;",
        "varying float vAlpha;",
        "void main() {",
        "  float d = length(gl_PointCoord - 0.5);",
        "  float alpha = 1.0 - smoothstep(0.12, 0.5, d);",
        "  gl_FragColor = vec4(vColor, alpha * vAlpha * uOpacity);",
        "  #include <tonemapping_fragment>",
        "  #include <colorspace_fragment>",
        "}"
      ].join("\n")
    });
    var particles = new THREE.Points(geometry, particleMaterial);
    stage.add(particles);

    var decorGroups = [createPhoenixEmbers(THREE), createAtomDecor(THREE), createLaurelDecor(THREE)];
    decorGroups.forEach(function (group) {
      group.visible = false;
      stage.add(group);
    });
    decorGroups[0].visible = true;

    var flareTexture = createFlareTexture(THREE);
    var flareMaterial = new THREE.SpriteMaterial({
      map: flareTexture,
      color: 0xffd21f,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var flare = new THREE.Sprite(flareMaterial);
    flare.position.set(1.35, 0.1, 0.7);
    flare.scale.set(0.2, 0.2, 1);
    stage.add(flare);

    var resizeObserver = new ResizeObserver(function () {
      var width = slider.clientWidth;
      var height = slider.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      var compact = width < 760;
      var scale = compact ? 0.78 : 1;
      stage.scale.setScalar(scale);
      stage.position.x = compact ? 0.65 : 1.18;
      cameraBaseZ = compact ? 10.8 : 10.2;
    });
    resizeObserver.observe(slider);

    var activeFrom = 0;
    var activeTo = 0;
    var transitionStart = 0;
    var reduced = reducedMotion.matches;
    var startTime = performance.now();

    function switchTargets(from, to) {
      geometry.setAttribute("aFrom", new THREE.BufferAttribute(targets[from].positions, 3));
      geometry.setAttribute("position", new THREE.BufferAttribute(targets[from].positions, 3));
      geometry.setAttribute("aTo", new THREE.BufferAttribute(targets[to].positions, 3));
      geometry.setAttribute("aColorFrom", new THREE.BufferAttribute(targets[from].colors, 3));
      geometry.setAttribute("aColorTo", new THREE.BufferAttribute(targets[to].colors, 3));
      geometry.setAttribute("aWingFrom", new THREE.BufferAttribute(targets[from].wing, 1));
      geometry.setAttribute("aWingTo", new THREE.BufferAttribute(targets[to].wing, 1));
    }

    function setDecorOpacity(group, opacity) {
      group.traverse(function (object) {
        if (!object.material) return;
        var materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (material) {
          if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = material.opacity;
          material.opacity = material.userData.baseOpacity * opacity;
        });
      });
    }

    function render(now) {
      var seconds = (now - startTime) / 1000;
      particleMaterial.uniforms.uTime.value = reduced ? 0 : seconds;
      if (!reduced) {
        orbitalCenterpiece.rotation.y += 0.00045;
        orbitalCenterpiece.rotation.x = Math.sin(seconds * 0.19) * 0.035;
        orbitalCenterpiece.userData.orbits.forEach(function (orbit, index) {
          orbit.rotation.y += (index === 1 ? -1 : 1) * (0.0012 + index * 0.00025);
        });
        orbitalCenterpiece.userData.planet.rotation.y += 0.001;
      }
      camera.position.x += ((reduced ? 0 : pointer.x * 0.19) - camera.position.x) * 0.025;
      var idleBob = reduced ? 0 : Math.sin(seconds * 0.24) * 0.095;
      camera.position.y += ((reduced ? 0 : pointer.y * 0.12) + idleBob - camera.position.y) * 0.025;
      var pushIn = 0;
      if (transitionStart && transitioning && !reduced) {
        var cameraProgress = Math.min(1, Math.max(0, (now - transitionStart) / duration));
        pushIn = Math.sin(cameraProgress * Math.PI) * 1.15;
      }
      camera.position.z += (cameraBaseZ - pushIn - camera.position.z) * 0.04;
      camera.lookAt(0, 0, 0);

      decorGroups.forEach(function (group, index) {
        if (group.visible) {
          group.rotation.y += reduced ? 0 : 0.0012;
          group.rotation.x = Math.sin(seconds * 0.16 + index) * (reduced ? 0 : 0.025);
        }
      });
      var embers = decorGroups[0].userData.embers;
      if (embers && decorGroups[0].visible && !reduced) {
        var emberPositions = embers.geometry.attributes.position;
        var basePositions = embers.geometry.userData.basePositions;
        for (var emberIndex = 0; emberIndex < emberPositions.count; emberIndex += 1) {
          emberPositions.array[emberIndex * 3] = basePositions[emberIndex * 3] + Math.sin(seconds * 1.4 + emberIndex) * 0.08;
          emberPositions.array[emberIndex * 3 + 1] = basePositions[emberIndex * 3 + 1] + (seconds * (0.12 + (emberIndex % 7) * 0.018)) % 0.48;
          emberPositions.array[emberIndex * 3 + 2] = basePositions[emberIndex * 3 + 2] + Math.cos(seconds + emberIndex * 0.3) * 0.07;
        }
        emberPositions.needsUpdate = true;
      }
      var burst = 0;
      if (transitionStart) {
        var transitionProgress = Math.min(1, Math.max(0, (now - transitionStart) / duration));
        if (!reduced && transitionProgress > 0.2 && transitionProgress < 0.82) {
          var rise = Math.min(1, (transitionProgress - 0.2) / 0.16);
          var fall = Math.min(1, (0.82 - transitionProgress) / 0.38);
          burst = Math.max(0, Math.min(rise, fall));
        }
      }
      particleMaterial.uniforms.uBurst.value = burst;
      if (!reduced && transitioning) {
        var flareAmount = Math.max(0, 1 - Math.abs(particleMaterial.uniforms.uProgress.value - 0.53) * 5);
        flareMaterial.opacity = flareAmount * 0.8;
        var flareSize = 0.22 + flareAmount * 2.5;
        flare.scale.set(flareSize, flareSize, 1);
        flare.position.x = 1.18 + Math.sin(seconds * 1.5) * 0.18;
      } else {
        flareMaterial.opacity = 0;
      }
      renderer.render(scene, camera);
      window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);

    window.addEventListener("pointermove", function (event) {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    return {
      startTransition: function (from, to, isReduced) {
        activeFrom = from;
        activeTo = to;
        transitionStart = performance.now();
        reduced = isReduced;
        switchTargets(from, to);
        particleMaterial.uniforms.uProgress.value = 0;
        particleMaterial.uniforms.uBurst.value = 0;
        particleMaterial.uniforms.uOpacity.value = 1;
        particleMaterial.userData.reducedSwitched = false;
        decorGroups[from].visible = true;
        decorGroups[to].visible = true;
        setDecorOpacity(decorGroups[from], 1);
        setDecorOpacity(decorGroups[to], 0);
      },
      updateTransition: function (eased, raw, isReduced) {
        setDecorOpacity(decorGroups[activeFrom], 1 - eased);
        setDecorOpacity(decorGroups[activeTo], eased);
        if (isReduced) {
          if (eased < 0.5) {
            particleMaterial.uniforms.uOpacity.value = 1 - eased * 2;
          } else {
            if (!particleMaterial.userData.reducedSwitched) {
              switchTargets(activeTo, activeTo);
              particleMaterial.userData.reducedSwitched = true;
            }
            particleMaterial.uniforms.uProgress.value = 0;
            particleMaterial.uniforms.uOpacity.value = (eased - 0.5) * 2;
          }
          particleMaterial.uniforms.uBurst.value = 0;
        } else {
          particleMaterial.uniforms.uProgress.value = eased;
          particleMaterial.uniforms.uOpacity.value = 1;
        }
      },
      finishTransition: function (index) {
        transitionStart = 0;
        activeFrom = index;
        activeTo = index;
        switchTargets(index, index);
        particleMaterial.uniforms.uProgress.value = 0;
        particleMaterial.uniforms.uBurst.value = 0;
        particleMaterial.uniforms.uOpacity.value = 1;
        decorGroups.forEach(function (group, i) {
          group.visible = i === index;
          setDecorOpacity(group, i === index ? 1 : 0);
        });
      },
      setReducedMotion: function (value) {
        reduced = value;
      }
    };
  }

  function seededRandom(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function buildPhoenixTargets() {
    var count = 25000;
    var random = seededRandom(2106);
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var wing = new Float32Array(count);
    var indigo = [0.95, 0.08, 0.14];
    var violet = [1, 0.22, 0.08];
    var amber = [1, 0.79, 0.04];

    for (var i = 0; i < count; i += 1) {
      var x = 0;
      var y = 0;
      var z = 0;
      var roll = random();
      var wingPoint = 0;

      if (roll < 0.45) {
        var side = random() < 0.5 ? -1 : 1;
        var feather = Math.floor(random() * 9);
        var along = random();
        var angle = (0.82 - feather * 0.16) * side;
        var length = 0.62 + (8 - feather) * 0.11;
        var spread = (random() - 0.5) * (0.15 + along * 0.13);
        x = side * (0.22 + Math.cos(Math.abs(angle)) * length * along) + spread * -Math.sin(angle);
        y = 0.27 + Math.sin(Math.abs(angle)) * length * along + spread * Math.cos(angle);
        z = (random() - 0.5) * (0.16 + (1 - along) * 0.2);
        wingPoint = 1;
      } else if (roll < 0.78) {
        var theta = random() * Math.PI * 2;
        var torso = Math.sqrt(random());
        x = Math.cos(theta) * 0.27 * torso;
        y = -0.22 + Math.sin(theta) * 0.62 * torso;
        z = Math.sin(random() * Math.PI * 2) * 0.25 * torso;
      } else if (roll < 0.87) {
        var headTheta = random() * Math.PI * 2;
        var headR = Math.sqrt(random());
        x = Math.cos(headTheta) * 0.17 * headR;
        y = 0.79 + Math.sin(headTheta) * 0.2 * headR;
        z = Math.sin(random() * Math.PI * 2) * 0.17 * headR;
      } else if (roll < 0.92) {
        x = 0.08 + random() * 0.5;
        y = 0.83 - (x - 0.08) * 0.5 + (random() - 0.5) * 0.035;
        z = (random() - 0.5) * 0.09;
      } else {
        var tailSide = random() < 0.5 ? -1 : 1;
        var tail = random();
        x = tailSide * (0.1 + tail * 0.48) + (random() - 0.5) * 0.07;
        y = -0.66 - tail * 1.05 + (random() - 0.5) * 0.1;
        z = (random() - 0.5) * 0.14;
      }

      positions[i * 3] = x + 1.18;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      wing[i] = wingPoint;
      var mix = random();
      var palette = mix < 0.46 ? indigo : mix < 0.75 ? violet : amber;
      var glow = 0.75 + random() * 0.4;
      colors[i * 3] = Math.min(1, palette[0] * glow);
      colors[i * 3 + 1] = Math.min(1, palette[1] * glow);
      colors[i * 3 + 2] = Math.min(1, palette[2] * glow);
    }
    return { positions: positions, colors: colors, wing: wing };
  }

  function buildAtomTargets() {
    var count = 25000;
    var random = seededRandom(901);
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var wing = new Float32Array(count);
    var yellow = [1, 0.78, 0.06];
    var cream = [1, 0.92, 0.56];
    var red = [0.95, 0.12, 0.16];
    for (var i = 0; i < count; i += 1) {
      var x;
      var y;
      var z;
      if (random() < 0.17) {
        var u = random() * Math.PI * 2;
        var v = Math.acos(2 * random() - 1);
        var radius = Math.pow(random(), 1 / 3) * 0.48;
        x = radius * Math.sin(v) * Math.cos(u);
        y = radius * Math.cos(v);
        z = radius * Math.sin(v) * Math.sin(u);
      } else {
        var orbit = Math.floor(random() * 3);
        var angle = random() * Math.PI * 2;
        var radiusRing = 1.28 + (random() - 0.5) * 0.18;
        x = Math.cos(angle) * radiusRing;
        y = Math.sin(angle) * radiusRing * 0.42;
        z = 0;
        if (orbit === 0) {
          var tilt = 0.16;
          y = y * Math.cos(tilt) - z * Math.sin(tilt);
          z = Math.sin(angle) * radiusRing * Math.sin(tilt);
        } else if (orbit === 1) {
          var tiltB = 1.03;
          y = y * Math.cos(tiltB) - z * Math.sin(tiltB);
          z = Math.sin(angle) * radiusRing * Math.sin(tiltB);
          x *= 0.9;
        } else {
          var tiltC = -0.9;
          y = y * Math.cos(tiltC) - z * Math.sin(tiltC);
          z = Math.sin(angle) * radiusRing * Math.sin(tiltC);
        }
      }
      positions[i * 3] = x + 1.18;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      var color = random() < 0.58 ? yellow : random() < 0.78 ? cream : red;
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
    }
    return { positions: positions, colors: colors, wing: wing };
  }

  function buildLaurelTargets() {
    var count = 25000;
    var random = seededRandom(317);
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var wing = new Float32Array(count);
    var gold = [1, 0.76, 0.08];
    var pale = [1, 0.91, 0.48];
    var rust = [0.94, 0.13, 0.16];
    for (var i = 0; i < count; i += 1) {
      var x;
      var y;
      var z;
      if (random() < 0.66) {
        var side = random() < 0.5 ? -1 : 1;
        var t = random();
        var angle = side < 0 ? Math.PI * (0.69 + t * 0.8) : Math.PI * (1.51 + t * 0.8);
        var radius = 1.42 + (random() - 0.5) * 0.08;
        var leaf = Math.floor(t * 11);
        var leafPhase = random() * Math.PI * 2;
        var leafSize = 0.1 + 0.04 * Math.sin((leaf / 11) * Math.PI);
        x = Math.cos(angle) * radius + Math.cos(leafPhase) * leafSize;
        y = Math.sin(angle) * radius + Math.sin(leafPhase) * leafSize * 1.6;
        z = (random() - 0.5) * 0.13;
      } else {
        var half = random() < 0.5 ? -1 : 1;
        var pageX = random() * 0.72;
        var pageY = random() * 0.63;
        x = half * (0.08 + pageX);
        y = -0.19 + pageY - pageX * 0.27;
        z = (random() - 0.5) * 0.11 + 0.12 * (1 - pageX);
      }
      positions[i * 3] = x + 1.18;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      var color = random() < 0.67 ? gold : random() < 0.7 ? pale : rust;
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
    }
    return { positions: positions, colors: colors, wing: wing };
  }

  function createStandardMaterial(THREE, color, options) {
    var material = new THREE.MeshStandardMaterial(Object.assign({
      color: color,
      metalness: 0.45,
      roughness: 0.34,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    }, options || {}));
    material.userData.baseOpacity = material.opacity;
    return material;
  }

  function addOrbit(THREE, group, radius, rotation, color, opacity) {
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.009, 8, 160),
      createStandardMaterial(THREE, color, { metalness: 0.7, roughness: 0.24, opacity: opacity })
    );
    ring.rotation.set(rotation[0], rotation[1], rotation[2]);
    group.add(ring);
    return ring;
  }

  function createHeroOrbit(THREE) {
    var group = new THREE.Group();
    var planet = new THREE.Group();
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.57, 48, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0x65121b,
        emissive: 0x3d090e,
        emissiveIntensity: 1.15,
        metalness: 0.25,
        roughness: 0.3,
        clearcoat: 0.85,
        clearcoatRoughness: 0.22
      })
    );
    planet.add(core);

    var atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.66, 36, 28),
      new THREE.MeshBasicMaterial({
        color: 0xed2939,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    planet.add(atmosphere);

    var highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 18),
      new THREE.MeshBasicMaterial({
        color: 0xffe994,
        transparent: true,
        opacity: 0.76,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    highlight.position.set(-0.2, 0.3, 0.42);
    planet.add(highlight);
    group.add(planet);

    var orbitSettings = [
      { radius: 1.1, tube: 0.014, color: 0xffd21f, opacity: 0.9, rotation: [0.74, 0.08, -0.13], speed: 0.0012 },
      { radius: 1.38, tube: 0.009, color: 0xed2939, opacity: 0.8, rotation: [1.15, 0.28, 0.22], speed: -0.00145 },
      { radius: 1.67, tube: 0.006, color: 0xffe891, opacity: 0.52, rotation: [0.34, -0.3, 0.52], speed: 0.0017 }
    ];
    var orbits = [];
    orbitSettings.forEach(function (settings, index) {
      var orbit = new THREE.Group();
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(settings.radius, settings.tube, 8, 160),
        new THREE.MeshBasicMaterial({
          color: settings.color,
          transparent: true,
          opacity: settings.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      ring.rotation.set(settings.rotation[0], settings.rotation[1], settings.rotation[2]);
      orbit.add(ring);

      var satellite = new THREE.Mesh(
        new THREE.SphereGeometry(index === 0 ? 0.075 : 0.045, 18, 14),
        new THREE.MeshStandardMaterial({
          color: settings.color,
          emissive: settings.color,
          emissiveIntensity: 1.8,
          metalness: 0.28,
          roughness: 0.2
        })
      );
      satellite.position.set(settings.radius, 0, 0);
      orbit.add(satellite);

      var mote = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfff1bd })
      );
      mote.position.set(-settings.radius * 0.72, 0, 0);
      orbit.add(mote);

      orbits.push(orbit);
      group.add(orbit);
    });

    var starCount = 520;
    var starPositions = new Float32Array(starCount * 3);
    var starColors = new Float32Array(starCount * 3);
    var random = seededRandom(782);
    for (var i = 0; i < starCount; i += 1) {
      var angle = random() * Math.PI * 2;
      var radius = 1.85 + random() * 0.9;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = (random() - 0.5) * 3.2;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.48;
      var color = random() < 0.28 ? [0.93, 0.12, 0.18] : [1, 0.81, 0.28];
      starColors[i * 3] = color[0];
      starColors[i * 3 + 1] = color[1];
      starColors[i * 3 + 2] = color[2];
    }
    var starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    var stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.66,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    group.add(stars);
    group.userData.planet = planet;
    group.userData.orbits = orbits;
    return group;
  }

  function createPhoenixEmbers(THREE) {
    var group = new THREE.Group();
    var count = 260;
    var positions = new Float32Array(count * 3);
    var random = seededRandom(44);
    for (var i = 0; i < count; i += 1) {
      var side = random() < 0.5 ? -1 : 1;
      positions[i * 3] = 1.18 + side * (1.55 + random() * 0.72);
      positions[i * 3 + 1] = 0.3 + random() * 0.9;
      positions[i * 3 + 2] = (random() - 0.5) * 0.65;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.userData.basePositions = positions.slice();
    var material = new THREE.PointsMaterial({
      color: 0xffd21f,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var embers = new THREE.Points(geometry, material);
    group.add(embers);
    group.userData.embers = embers;
    return group;
  }

  function createAtomDecor(THREE) {
    var group = new THREE.Group();
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.37, 32, 24),
      createStandardMaterial(THREE, 0xffd21f, { emissive: 0x75410a, emissiveIntensity: 1.7, metalness: 0.2, roughness: 0.2, opacity: 0.82 })
    );
    core.position.set(1.18, 0, 0);
    group.add(core);
    addOrbit(THREE, group, 1.32, [0.18, 0.08, 0], 0xffd21f, 0.76);
    addOrbit(THREE, group, 1.27, [1.08, 0.38, 0.18], 0xed2939, 0.68);
    addOrbit(THREE, group, 1.33, [0.55, 1.12, -0.2], 0xffeb85, 0.62);
    for (var i = 0; i < 3; i += 1) {
      var angle = i * Math.PI * 0.66 + 0.3;
      var electron = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 20, 16),
        createStandardMaterial(THREE, 0xfff0a3, { emissive: 0xffb900, emissiveIntensity: 2.4, roughness: 0.18, metalness: 0.1, opacity: 0.95 })
      );
      electron.position.set(1.18 + Math.cos(angle) * 1.3, Math.sin(angle) * 0.7, Math.sin(angle * 0.7) * 0.56);
      group.add(electron);
    }
    for (var j = 0; j < 5; j += 1) {
      var cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.23 + (j % 2) * 0.09, 0.28, 0.11),
        createStandardMaterial(THREE, j % 2 ? 0xed2939 : 0xffd21f, { metalness: 0.25, roughness: 0.18, opacity: 0.32 })
      );
      var a = j * Math.PI * 0.4;
      cube.position.set(1.18 + Math.cos(a) * 1.88, Math.sin(a) * 0.68, Math.sin(a * 1.2) * 0.58);
      cube.rotation.set(a * 0.25, a, a * 0.4);
      group.add(cube);
    }
    for (var shelfIndex = 0; shelfIndex < 3; shelfIndex += 1) {
      var shelf = new THREE.Group();
      var shelfMaterial = createStandardMaterial(THREE, 0xffd21f, {
        metalness: 0.18,
        roughness: 0.2,
        opacity: 0.3
      });
      var shelfBoard = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.2), shelfMaterial);
      shelfBoard.position.y = -0.08;
      shelf.add(shelfBoard);
      var upperBoard = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.2), shelfMaterial);
      upperBoard.position.y = 0.25;
      shelf.add(upperBoard);
      for (var postIndex = 0; postIndex < 2; postIndex += 1) {
        var post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.37, 0.17), shelfMaterial);
        post.position.set(postIndex ? 0.29 : -0.29, 0.08, 0);
        shelf.add(post);
      }
      for (var bookIndex = 0; bookIndex < 4; bookIndex += 1) {
        var bookHeight = 0.16 + (bookIndex % 3) * 0.045;
        var book = new THREE.Mesh(
          new THREE.BoxGeometry(0.085, bookHeight, 0.13),
          createStandardMaterial(THREE, bookIndex % 2 ? 0xffe778 : 0xed2939, {
            metalness: 0.22,
            roughness: 0.25,
            opacity: 0.55
          })
        );
        book.position.set(-0.2 + bookIndex * 0.13, -0.025 + bookHeight / 2, 0.03);
        shelf.add(book);
      }
      var shelfAngle = shelfIndex * Math.PI * 0.72 + 0.45;
      shelf.position.set(
        1.18 + Math.cos(shelfAngle) * 2.0,
        Math.sin(shelfAngle) * 1.32,
        Math.sin(shelfAngle * 0.8) * 0.6
      );
      shelf.rotation.z = -Math.cos(shelfAngle) * 0.18;
      shelf.scale.setScalar(0.8);
      group.add(shelf);
    }
    return group;
  }

  function createLaurelDecor(THREE) {
    var group = new THREE.Group();
    var gold = createStandardMaterial(THREE, 0xd7ad12, { metalness: 0.72, roughness: 0.23, opacity: 0.82 });
    var paleGold = createStandardMaterial(THREE, 0xffe35a, { metalness: 0.58, roughness: 0.28, opacity: 0.91 });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.025, 8, 120), gold);
    ring.position.set(1.18, 0, -0.02);
    group.add(ring);
    for (var i = 0; i < 18; i += 1) {
      var angle = -Math.PI * 0.82 + (i / 17) * Math.PI * 1.64;
      var leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), i % 2 ? gold : paleGold);
      leaf.scale.set(0.45, 1.7, 0.36);
      leaf.position.set(1.18 + Math.cos(angle) * 1.52, Math.sin(angle) * 1.52, Math.sin(i * 0.8) * 0.08);
      leaf.rotation.z = angle + Math.PI / 2;
      group.add(leaf);
    }

    var book = new THREE.Group();
    book.position.set(1.18, -0.16, 0.18);
    var pageMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffeaa0,
      metalness: 0.06,
      roughness: 0.16,
      transmission: 0.72,
      thickness: 0.28,
      transparent: true,
      opacity: 0.58,
      depthWrite: false
    });
    pageMaterial.userData.baseOpacity = pageMaterial.opacity;
    var leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.7), pageMaterial);
    leftPage.position.set(-0.34, 0.03, 0);
    leftPage.rotation.z = -0.1;
    book.add(leftPage);
    var rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.7), pageMaterial.clone());
    rightPage.position.set(0.34, 0.03, 0);
    rightPage.rotation.z = 0.1;
    book.add(rightPage);
    var spine = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.73), paleGold);
    spine.position.y = -0.035;
    book.add(spine);
    var cover = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.035, 0.76),
      createStandardMaterial(THREE, 0x8e1c26, { metalness: 0.34, roughness: 0.38, opacity: 0.88 })
    );
    cover.position.y = -0.12;
    book.add(cover);
    group.add(book);

    var trophyMaterial = createStandardMaterial(THREE, 0xffd21f, { metalness: 0.84, roughness: 0.19, emissive: 0x58340c, emissiveIntensity: 0.34, opacity: 0.85 });
    for (var j = 0; j < 3; j += 1) {
      var trophy = new THREE.Group();
      var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 16, 1, true), trophyMaterial);
      cup.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), trophyMaterial));
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.22, 10), trophyMaterial);
      stem.position.y = -0.24;
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.06, 14), trophyMaterial);
      base.position.y = -0.38;
      trophy.add(cup, stem, base);
      var a = j * Math.PI * 0.72 + 0.1;
      trophy.position.set(1.18 + Math.cos(a) * 1.95, Math.sin(a) * 1.58, Math.sin(a * 0.7) * 0.36);
      trophy.scale.setScalar(0.48);
      trophy.rotation.z = -Math.cos(a) * 0.22;
      group.add(trophy);
    }

    var cap = new THREE.Group();
    var mortarboard = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.045, 0.55), paleGold);
    mortarboard.rotation.y = Math.PI / 4;
    var capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.14, 16), gold);
    capBase.position.y = -0.1;
    var tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), paleGold);
    tassel.position.set(0.19, -0.09, 0.1);
    cap.add(mortarboard, capBase, tassel);
    cap.position.set(2.85, 0.58, 0.1);
    cap.rotation.set(0.3, 0.4, -0.22);
    group.add(cap);
    return group;
  }

  function createFlareTexture(THREE) {
    var textureCanvas = document.createElement("canvas");
    textureCanvas.width = 128;
    textureCanvas.height = 128;
    var context = textureCanvas.getContext("2d");
    if (!context) throw new Error("A 2D context is required to create the transition flare.");
    var gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.08, "rgba(255,239,196,.9)");
    gradient.addColorStop(0.25, "rgba(255,189,102,.4)");
    gradient.addColorStop(1, "rgba(255,160,50,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(textureCanvas);
  }

  wrapWords();
  bindControls();
  if (reducedMotion.matches) {
    slider.classList.add("is-reduced");
    pauseReasons.add("reduced-motion");
  }
  updateProgress();

  import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js")
    .then(function (THREE) {
      sceneState = createScene(THREE);
      if (!sceneState) throw new Error("WebGL renderer could not be created.");
      slider.classList.remove("is-loading");
      slider.classList.add("is-ready");
      setStatus("The Phoenix hero artwork is ready.");
      if (!reducedMotion.matches && !pauseReasons.size) scheduleAutoplay(6000);
    })
    .catch(fail);
})();
