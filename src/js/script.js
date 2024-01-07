const video = document.querySelector('.player');
const canvas = document.querySelector('.photo');
const ctx = canvas.getContext('2d');
const strip = document.querySelector('.strip');
const snap = document.querySelector('.snap');
const takePhotoButton = document.querySelector('.takePhoto') 
const redEffectButton = document.querySelector('.redEffectButton');
const greenScreenButton = document.querySelector('.greenScreenButton');
const rgbSplitButton = document.querySelector('.rgbSplitButton')
const recordButton = document.querySelector('.recordButton');
const stopButton = document.querySelector('.stopButton')
const sliders = document.querySelector('.rgb')
const noEffectButton = document.querySelector('.noEffect');
const downloadButton = document.querySelector('.downloadButton')
const blurButton = document.querySelector('.blurButton')
const unblurButton = document.querySelector('.unblurButton')
const videoLink = document.createElement('a');
const photoLink = document.createElement('a');
// var segmentation;
let animationId;
let showOriginal = false;

let effectFunction = noEffect;
let camera_stream = null;
let media_recorder = null;
let blocs_recorded = [];

async function getVideo() {
  try {
    camera_stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
    console.log(camera_stream);
//  DEPRECIATION : 
//       The following has been depreceated by major browsers as of Chrome and Firefox.
//       video.src = window.URL.createObjectURL(localMediaStream);
//       Please refer to these:
//       Deprecated  - https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
//       Newer Syntax - https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject
      
      video.srcObject = camera_stream;
      video.play();
    }
  catch(err) {
      console.error(`OH NO!!!`, err);
  }
}

function paintToCanvas() {
  const aspectRatio = video.videoWidth / video.videoHeight;
  const width =  window.innerWidth * 0.6;
  const height = width / aspectRatio;
  canvas.width =  width;
  canvas.height = height;
  video.width = width;
  video.height = height

  function draw() {
    ctx.drawImage(video, 0, 0, width, height);
    // take the pixels out
    let pixels = ctx.getImageData(0, 0, width, height);
    // mess with them
    // pixels = redEffect(pixels);

    pixels = effectFunction(pixels);
    // ctx.globalAlpha = 0.8;

    // pixels = greenScreen(pixels);
    // put them back
    ctx.putImageData(pixels, 0, 0);

    requestAnimationFrame(draw);
    
  }

  draw();
}



async function removeBg() {
  const net = await bodyPix.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  });

  async function updateFrame() {
    // Apply the BodyPix effect
    const segmentation = await net.segmentPerson(video, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.5
    });

    const foregroundColor = { r: 0, g: 0, b: 0, a: 255 };
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
    const backgroundDarkeningMask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor, false);

    // Add your code to apply the mask to the video here
    compositeFrame(backgroundDarkeningMask);
  

  // Request the next frame
  animationId = requestAnimationFrame(updateFrame);
  }


  // Start the animation
  updateFrame();
}

// Call this function to stop the animation
function stopAnimation() {
  cancelAnimationFrame(animationId);
  console.log(animationId)
}

async function compositeFrame(backgroundDarkeningMask) {
  if (!backgroundDarkeningMask) return;
  // var ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'destination-over';
  ctx.putImageData(backgroundDarkeningMask, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  // bodyPix.drawBokehEffect(canvas, video, segmentation, 15, 9);
  ctx.drawImage(video, 0, 0, 553, 414);
  // debugger
}

function takePhoto() {
  // played the sound
  snap.currentTime = 0;
  snap.play();

  // take the data out of the canvas
  const data = canvas.toDataURL('image/jpeg');
  photoLink.href = data;
  photoLink.setAttribute('download', 'handsome');
  photoLink.innerHTML = `<img src="${data}" alt="Handsome Man" />`;
  strip.insertBefore(photoLink, strip.firstChild);

  setTimeout(() => {
    strip.removeChild(photoLink)
  },3000)
}

function recordVideo(){
  media_recorder = new MediaRecorder(camera_stream,{
    mimeType: 'video/webm',
  })

  media_recorder.addEventListener('dataavailable',(e) =>{
    blocs_recorded.push(e.data)
  })

  media_recorder.addEventListener('stop', () => {
    let video_local = URL.createObjectURL(new Blob(blocs_recorded, {type: 'video/webm'}))
    console.log(video_local);
    videoLink.href = video_local;
    videoLink.setAttribute('download','YourVideo')
    videoLink.innerHTML = 'Your Video'
    // link.innerHTML = `<video src="${video_local}" alt="recoded video" />`
    strip.insertBefore(videoLink,strip.firstChild)

    setTimeout(() => {
      strip.removeChild(videoLink);
    },3000)
  })

  media_recorder.start(1000);
}

function stopRecording(){
  media_recorder.stop();
}

function noEffect(pixels){
  ctx.clearRect(0,0,553,414)
  return pixels;
}

function redEffect(pixels) {
  for (let i = 0; i < pixels.data.length; i+=4) {
    pixels.data[i + 0] = pixels.data[i + 0] + 200; // RED
    pixels.data[i + 1] = pixels.data[i + 1] - 50; // GREEN
    pixels.data[i + 2] = pixels.data[i + 2] * 0.5; // Blue
    
  }
  return pixels;
}

function rgbSplit(pixels) {
  for (let i = 0; i < pixels.data.length; i+=4) {
    pixels.data[i - 150] = pixels.data[i + 0]; // RED
    pixels.data[i + 500] = pixels.data[i + 1]; // GREEN
    pixels.data[i - 550] = pixels.data[i + 2]; // Blue
  }

  // sliders.remove();
  return pixels;
}

function greenScreen(pixels) {
  const levels = {};

  document.querySelectorAll('.rgb input').forEach((input) => {
    levels[input.name] = input.value;
  });

  for (let i = 0; i < pixels.data.length; i = i + 4) {
    let red = pixels.data[i + 0];
    let green = pixels.data[i + 1];
    let blue = pixels.data[i + 2];
    let alpha = pixels.data[i + 3];

    if (red >= levels.rmin
      && green >= levels.gmin
      && blue >= levels.bmin
      && red <= levels.rmax
      && green <= levels.gmax
      && blue <= levels.bmax) {
      // take it out!
      pixels.data[i + 3] = 0;
    }
  }

  // sliders.style.display = 'block';
  return pixels;
}


getVideo();

video.addEventListener('canplay', paintToCanvas);
takePhotoButton.addEventListener('click',takePhoto)
noEffectButton.addEventListener('click', () => {
  effectFunction =  noEffect;
  sliders.style.display = 'none';
})
rgbSplitButton.addEventListener('click', () => {
  effectFunction = rgbSplit;
  sliders.style.display = 'none';
})
redEffectButton.addEventListener('click', () => {
  effectFunction = redEffect
  sliders.style.display = 'none';
})
greenScreenButton.addEventListener('click', () => {
  effectFunction = greenScreen
  sliders.style.display = 'block';
  if(window.innerWidth < 375){
    sliders.style.display = 'none'
  }
})

recordButton.addEventListener('click',() =>{
  recordVideo()
  recordButton.hidden = true;
  stopButton.hidden = false;
  sliders.style.display = 'none';
});
stopButton.addEventListener('click', () =>{
  stopRecording()
  recordButton.hidden = false;
  stopButton.hidden = true;
  sliders.style.display = 'none';
});

blurButton.addEventListener('click', () => {
  blurButton.hidden = true;
  unblurButton.hidden = false;
  sliders.style.display = 'none';
  removeBg()
})
unblurButton.addEventListener('click', () => {
  blurButton.hidden = false
  unblurButton.hidden = true
  
  sliders.style.display = 'none';
  stopAnimation()
  paintToCanvas()
  alert("“Use the ‘Remove background’ button sparingly and wait 5-10 seconds between uses for optimal performance. If glitches occur, refresh the page. Thanks for your patience.”")
})