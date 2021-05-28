// examples
// https://github.com/sauceishere/tensorcamerajs/blob/master/App.js
// https://js.tensorflow.org/api_react_native/0.2.1/#cameraWithTensors
// https://github.com/tensorflow/tfjs/blob/master/tfjs-react-native/integration_rn59/components/webcam/realtime_demo.tsx

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  StatusBar,
  Image,
  TouchableOpacity
} from "react-native";
import * as tf from "@tensorflow/tfjs";
// import { fetch } from "@tensorflow/tfjs-react-native";
// import * as mobilenet from "@tensorflow-models/mobilenet";
import * as handpose from "@tensorflow-models/handpose";
// import * as jpeg from "jpeg-js";
// import * as ImagePicker from "expo-image-picker";
// import Constants from "expo-constants";
// import * as Permissions from "expo-permissions";
// import { ExpoWebGLRenderingContext } from "expo-gl";
import { Camera } from "expo-camera";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";

export default function Liveness() {
  const [isTfReady, setIsTfReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [model, setModel] = useState(null);
  const [predictions, setPredictions] = useState(false);
  const [image, setImage] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);

  const TensorCamera = cameraWithTensors(Camera);

  useEffect(() => {
    async function go() {
      console.log("run");
      await tf.ready();
      setIsTfReady(true);
      const model = await handpose.load();
      setIsModelReady(true);
      setModel(model);
      //   console.log("predictions:", predictions);
      //   setPredictions(predictions);
    }
    go();
  }, []);

  function HandleImageTensorReady(images) {
    const loop = async () => {
      const nextImageTensor = images.next().value;
      console.log("nextImageTensor:", nextImageTensor);

      //
      // do something with tensor here
      //

      if (nextImageTensor) {
        console.log("yes go");
        const predictions = await model.estimateHands(nextImageTensor);
        console.log("predictions:", predictions);
      }

    };
    loop();
  }

  const inputTensorWidth = 152;
  const inputTensorHeight = 200;
  const AUTORENDER = true;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.transparentText}>Tap to choose image go</Text>
      <View style={styles.loadingContainer}>
        <Text style={styles.text}>
          TFJS ready? {isTfReady ? <Text>✅</Text> : <Text />}
        </Text>

        <View style={styles.loadingModelContainer}>
          <Text style={styles.text}>Model ready? </Text>
          {isModelReady
            ? <Text style={styles.text}>✅</Text>
            : <ActivityIndicator size="small" />}
        </View>
      </View>
      <TouchableOpacity
        style={styles.imageWrapper}
      >
        <TensorCamera
          // Standard Camera props
          style={styles.camera}
          type={Camera.Constants.Type.front}
          zoom={0}
          // tensor related props
          cameraTextureHeight={1200}
          cameraTextureWidth={1600}
          resizeHeight={inputTensorHeight}
          resizeWidth={inputTensorWidth}
          resizeDepth={3}
          onReady={(images, updatePreview, gl) =>
            HandleImageTensorReady(images)}
          autorender={AUTORENDER}
        />
        {/* <Text style={styles.transparentText}>Tap to choose image</Text> */}
      </TouchableOpacity>
      <View style={styles.predictionWrapper} />
      <View style={styles.footer}>
        <Text style={styles.poweredBy}>Powered by:</Text>
        {/* <Image source={require("./assets/tfjs.jpg")} style={styles.tfLogo} /> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#171f24",
    alignItems: "center"
  },
  loadingContainer: {
    marginTop: 80,
    justifyContent: "center"
  },
  text: {
    color: "#ffffff",
    fontSize: 16
  },
  cameraContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "#fff"
  },
  camera: {
    position: "absolute",
    left: 50,
    top: 100,
    width: 600 / 2,
    height: 800 / 2,
    zIndex: 1,
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 0
  },
  loadingModelContainer: {
    flexDirection: "row",
    marginTop: 10
  },
  imageWrapper: {
    width: 280,
    height: 280,
    padding: 10,
    borderColor: "#cf667f",
    borderWidth: 5,
    borderStyle: "dashed",
    marginTop: 40,
    marginBottom: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  imageContainer: {
    width: 250,
    height: 250,
    position: "absolute",
    top: 10,
    left: 10,
    bottom: 10,
    right: 10
  },
  predictionWrapper: {
    height: 100,
    width: "100%",
    flexDirection: "column",
    alignItems: "center"
  },
  transparentText: {
    color: "#ffffff",
    opacity: 0.7
  },
  footer: {
    marginTop: 40
  },
  poweredBy: {
    fontSize: 20,
    color: "#e69e34",
    marginBottom: 6
  },
  tfLogo: {
    width: 125,
    height: 70
  }
});