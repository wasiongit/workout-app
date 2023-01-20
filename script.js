const videoElement = document.querySelector("#input_video");
const canvasElement = document.querySelector("#output_canvas");

canvasElement.width = videoElement.clientWidth;
canvasElement.height = videoElement.clientHeight;

videoElement.addEventListener("loadeddata", setCanvasSize);

function setCanvasSize() {
  canvasElement.height = videoElement.clientHeight;
  canvasElement.width = videoElement.clientWidth;
}

function onResults(results) {
  if (!results.poseLandmarks) {
    return;
  }

  const canvasCtx = canvasElement.getContext("2d");

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  drawPose(canvasCtx, results);

  console.log(classifyPose(results));
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  selfieMode: true,
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();

function drawPose(canvasCtx, poseResults) {
  canvasCtx.save();

  canvasCtx.drawImage(
    poseResults.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  drawConnectors(canvasCtx, poseResults.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00FF00",
    lineWidth: 4,
  });
  drawLandmarks(canvasCtx, poseResults.poseLandmarks, {
    color: "#FF0000",
    lineWidth: 2,
  });

  canvasCtx.restore();
}

// Function to classify if pose is standing, sitting, or squatting
function classifyPose(poseResults) {
  // Get the pose landmarks
  const poseLandmarks = poseResults.poseLandmarks;

  // Pose class angles min and max
  const poseClassAngles = {
    stand: { min: 175, max: 185 },
    squat: { min: 110, max: 140 },
  };

  // Get Hip, Knee, and Ankle landmarks
  const [lHip, rHip, lKnee, rKnee, lAnkle, rAnkle] = poseLandmarks.slice(
    23,
    29
  );

  // Check Knee and Ankle visibility
  if (lKnee.visibility > 0.5 && rKnee.visibility > 0.5 && lAnkle.visibility > 0.5 && rAnkle.visibility > 0.5) {
    // Get Knees angle
    const lKneeAngle = getPoseAngle(lHip, lKnee, lAnkle);
    const rKneeAngle = getPoseAngle(rHip, rKnee, rAnkle);
    const kneeAngle = (lKneeAngle + rKneeAngle) / 2;

    // Check if pose is squatting
    if (kneeAngle > poseClassAngles.squat.min && kneeAngle < poseClassAngles.squat.max) {
      return "squat";
    } else if (kneeAngle > poseClassAngles.stand.min && kneeAngle < poseClassAngles.stand.max) {
      return "stand";
    } else {
      return "null";
    }
  } else {
    return "null";
  }
}

// Get pose angle from first, middle, and last landmarks
function getPoseAngle(l1, l2, l3) {
  let { x: x1, y: y1 } = l1;
  let { x: x2, y: y2 } = l2;
  let { x: x3, y: y3 } = l3;

  let a1 = Math.atan2(y3 - y2, x3 - x2);
  let a2 = Math.atan2(y1 - y2, x1 - x2);

  let a_rad = a1 - a2;
  let a_deg = Math.round((a_rad * 180) / Math.PI);

  // if angle is negative, abs it
  if (a_deg < 0) a_deg = Math.abs(a_deg);

  // if angle is greater than 180, subtract from 360
  if (a_deg > 180) a_deg = 360 - a_deg;

  return a_deg;
}
