/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

 import React, { Fragment } from 'react'; 
 import * as tf from '@tensorflow/tfjs';
 import '@tensorflow/tfjs-react-native';
import {ActivityIndicator, SafeAreaView, TouchableHighlight, Text, StyleSheet, View, Image, Platform } from 'react-native';
// import Svg, { Circle, Rect, G, Line} from 'react-native-svg';
import * as svgComponents from 'react-native-svg';

import * as Permissions from 'expo-permissions';
import { Camera } from 'expo-camera';
import { ExpoWebGLRenderingContext } from 'expo-gl';

import * as blazeface from '@tensorflow-models/blazeface';
import * as posenet from '@tensorflow-models/posenet';
import {cameraWithTensors} from '@tensorflow/tfjs-react-native';

// const IMAGE_SIZE = 256;
// const inputMax = 1;
// const inputMin = -1;
// const normalizationConstant = (inputMax - inputMin) / 255.0;

  let frameCount = 0;
// import LOGO from './assets/images/logo'
 const BACKEND_TO_USE = 'rn-webgl';
  
 interface AppState {
   isTfReady: boolean;
   hasCameraPermission?: boolean;
   // tslint:disable-next-line: no-any
   cameraType: any;
   isLoading: boolean;
   posenetModel?: posenet.PoseNet;
   pose?: posenet.Pose;
   // tslint:disable-next-line: no-any
   faceDetector?: any;
   faces?: blazeface.NormalizedFace[];
   modelName: string;
  //  higherHRNetModel?: any;
  //  hrnet_output?:null;
 }

const inputTensorWidth = 152;
const inputTensorHeight = 200;

const AUTORENDER = true;

// tslint:disable-next-line: variable-name
const TensorCamera = cameraWithTensors(Camera);
 
 class App extends React.Component<{}, AppState> {
   rafID?: number;

   constructor(props: {}) {
     super(props);
     this.state = {
       isTfReady: false,
       isLoading: true,
       cameraType: Camera.Constants.Type.front,
       modelName: 'posenet',
     };
     this.handleImageTensorReady = this.handleImageTensorReady.bind(this);
   }

   async loadPosenetModel() {
    const model =  await posenet.load({
      architecture: 'ResNet50',
      outputStride: 16,
      inputResolution: { width: inputTensorWidth, height: inputTensorHeight },
      multiplier: 1.0,
      quantBytes: 2
    });
    return model;
  }

  async loadBlazefaceModel() {
    const model =  await blazeface.load();
    return model;
  }

  // async loadHigherHRNetModel(){
  //   const model = await tf.loadGraphModel('http://192.168.0.130:8080/model.json');
  //   return model;
  // }

  async handleImageTensorReady(
    images: IterableIterator<tf.Tensor3D>,
    updatePreview: () => void, gl: ExpoWebGLRenderingContext) {
    const loop = async () => {
      const {modelName} = this.state;
      if(!AUTORENDER) {
        updatePreview();
      }

      if(modelName === 'posenet') {
        if (this.state.posenetModel != null) {
          const imageTensor = images.next().value;
          const flipHorizontal = Platform.OS === 'ios' ? false : true;
          const pose = await this.state.posenetModel.estimateSinglePose(
            imageTensor, { flipHorizontal });
          this.setState({pose});
          tf.dispose([imageTensor]);
        }
      } else {
        if (this.state.faceDetector != null) {
          const imageTensor = images.next().value;
          const returnTensors = false;
          const faces = await this.state.faceDetector.estimateFaces(
            imageTensor, returnTensors);

          this.setState({faces});
          tf.dispose(imageTensor);
        }
      }


      // if (this.state.higherHRNetModel != null) {
      //   const imageTensor = images.next().value;        
      //   const normalized = tf.add(
      //     tf.mul(tf.cast(imageTensor, 'float32'), normalizationConstant),
      //     inputMin);
        
      //   if (imageTensor.shape[0] !== IMAGE_SIZE || imageTensor.shape[1] !== IMAGE_SIZE) {
      //     const alignCorners = true;
      //     const resized = tf.image.resizeBilinear(
      //       normalized, [IMAGE_SIZE, IMAGE_SIZE], alignCorners);
          
      //     const batched = tf.reshape(resized, [1, IMAGE_SIZE, IMAGE_SIZE, 3]);
      //     const hrnet_output = await this.state.higherHRNetModel.predict(
      //       batched);
  
      //     this.setState({hrnet_output});
      //     tf.dispose([imageTensor]);
      //     tf.dispose([normalized]);
      //     tf.dispose([batched]);
      //     tf.dispose([resized]);
      //   }

      //   console.log(this.state.hrnet_output)
      // }



      if(!AUTORENDER) {
        gl.endFrameEXP();
      }
      this.rafID = requestAnimationFrame(loop);
      frameCount = frameCount + 1;
      console.log(frameCount)
    };

    loop();
  }
   
   
  componentWillUnmount() {
    if(this.rafID) {
      cancelAnimationFrame(this.rafID);
    }
  }

   async componentDidMount() {
     await tf.setBackend(BACKEND_TO_USE);
     await tf.ready();
     const { status } = await Permissions.askAsync(Permissions.CAMERA);

    //  const [blazefaceModel, posenetModel, higherHRNetModel] =
    //  await Promise.all([this.loadBlazefaceModel(), this.loadPosenetModel(), this.loadHigherHRNetModel()]);
    const [blazefaceModel, posenetModel] =
    await Promise.all([this.loadBlazefaceModel(), this.loadPosenetModel()]);

     this.setState({
       isTfReady: true,
       hasCameraPermission: status === 'granted',
       isLoading: false,
       faceDetector: blazefaceModel,
       posenetModel,
      //  higherHRNetModel,
     });
   }


   renderPose() {
    const MIN_KEYPOINT_SCORE = 0.2;
    const {pose} = this.state;
    if (pose != null) {
      const keypoints = pose.keypoints
        .filter(k => k.score > MIN_KEYPOINT_SCORE)
        .map((k,i) => {
          return <svgComponents.Circle
            key={`skeletonkp_${i}`}
            cx={k.position.x}
            cy={k.position.y}
            r='2'
            strokeWidth='0'
            fill='blue'
          />;
        });

      const adjacentKeypoints =
        posenet.getAdjacentKeyPoints(pose.keypoints, MIN_KEYPOINT_SCORE);

      const skeleton = adjacentKeypoints.map(([from, to], i) => {
        return <svgComponents.Line
          key={`skeletonls_${i}`}
          x1={from.position.x}
          y1={from.position.y}
          x2={to.position.x}
          y2={to.position.y}
          stroke='magenta'
          strokeWidth='1'
        />;
      });

      return <svgComponents.Svg height='100%' width='100%'
        viewBox={`0 0 ${inputTensorWidth} ${inputTensorHeight}`}>
          {skeleton}
          {keypoints}
          <svgComponents.Text
            stroke="purple"
            fontSize="10"
            fontWeight="bold"
            x="100"
            y="20"
            textAnchor="middle"
          >
            {frameCount}
          </svgComponents.Text>
        </svgComponents.Svg>;
    } else {
      return null;
    }
  }

  renderFaces() {
    const {faces} = this.state;
    if(faces != null) {
      const faceBoxes = faces.map((f, fIndex) => {
        const topLeft = f.topLeft as number[];
        const bottomRight = f.bottomRight as number[];

        const landmarks = (f.landmarks as number[][]).map((l, lIndex) => {
          return <svgComponents.Circle
            key={`landmark_${fIndex}_${lIndex}`}
            cx={l[0]}
            cy={l[1]}
            r='2'
            strokeWidth='0'
            fill='blue'
            />;
        });

        return <svgComponents.G key={`facebox_${fIndex}`}>
          <svgComponents.Rect
            x={topLeft[0]}
            y={topLeft[1]}
            fill={'red'}
            fillOpacity={0.2}
            width={(bottomRight[0] - topLeft[0])}
            height={(bottomRight[1] - topLeft[1])}
          />
          {landmarks}
        </svgComponents.G>;
      });

      const flipHorizontal = Platform.OS === 'ios' ? 1 : -1;
      return <svgComponents.Svg height='100%' width='100%'
        viewBox={`0 0 ${inputTensorWidth} ${inputTensorHeight}`}
        scaleX={flipHorizontal}>
          {faceBoxes}
        </svgComponents.Svg>;
    } else {
      return null;
    }
  }

  flipCamera() {
    const newState = this.state.cameraType === Camera.Constants.Type.front
          ? Camera.Constants.Type.back
          : Camera.Constants.Type.front;
    console.log(this.state.cameraType)
    this.setState({
      cameraType: newState,
    });
  }


  render() {
    const {isLoading, modelName} = this.state;

    // TODO File issue to be able get this from expo.
    // Caller will still need to account for orientation/phone rotation changes
    let textureDims: { width: number; height: number; };
    if (Platform.OS === 'ios') {
        textureDims = {
          height: 1920,
          width: 1080,
        };
      } else {
        textureDims = {
          height: 1200,
          width: 1600,
        };
      }

    const camView = <View style={styles.cameraContainer}>
      <TensorCamera
        // Standard Camera props
        style={styles.camera}
        type={this.state.cameraType}
        zoom={0}
        // tensor related props
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={inputTensorHeight}
        resizeWidth={inputTensorWidth}
        resizeDepth={3}
        onReady={this.handleImageTensorReady}
        autorender={AUTORENDER}
      />
      <View style={styles.modelResults}>
        {modelName === 'posenet' ? this.renderPose() : this.renderFaces()}
      </View>
      <View style={styles.controlSpace}>
          <TouchableHighlight
            style={styles.flipCameraBtn}
            onPress={() => {this.flipCamera();}}
            underlayColor='#FFDE03'>
            <Text style={styles.textStyle}>
              FLIP CAMERA
            </Text>
            
          </TouchableHighlight>
        </View>
    </View>;

    return (
      <SafeAreaView style={styles.body}>
        
        <View style={styles.logoStyle}>
          <Image
            resizeMode='contain'
            style={{ width: 100, height: 100 }}
            source={require('./assets/images/mmh-logo.png')}
          />
        </View>
        
        {isLoading ? <View style={[styles.loadingIndicator]}>
          <ActivityIndicator size='large' color='#FF0266' />
        </View> : camView}

      </SafeAreaView>
    );
  }
 }
 
 const styles = StyleSheet.create({
   body: {
    backgroundColor: 'white',
    width:'100%',
   },
   logoStyle: {
    alignItems: 'center',
    marginTop: 80,
  },
  loadingIndicator: {
    position: 'relative',
    marginTop: 150,
    alignItems: 'center',
    zIndex: 200
  },
  cameraContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    position: 'relative',
  },
  camera : {
    position:'absolute',
    left: 45,
    top: 60,
    width: 600/2,
    height: 800/2,
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 0,
  },
  modelResults: {
    position:'absolute',
    left: 45,
    top: 60,
    width: 600/2,
    height: 800/2,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 0,
  },
  textStyle: {
    fontSize: 16, 
    color: 'white',
  },
  controlSpace: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    marginTop: 80,
    position: 'relative',
    
  },
  flipCameraBtn: {
    backgroundColor: '#424242',
    width: '100%',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
 });
 
 export default App