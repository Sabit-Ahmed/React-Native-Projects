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
 import { ActivityIndicator, SafeAreaView, TouchableHighlight, Text, StyleSheet, View, Image, Platform } from 'react-native';
 // import Svg, { Circle, Rect, G, Line} from 'react-native-svg';
 import * as svgComponents from 'react-native-svg';
 
 import * as Permissions from 'expo-permissions';
 import { Camera } from 'expo-camera';
 import { ExpoWebGLRenderingContext } from 'expo-gl';
 
 // import * as blazeface from '@tensorflow-models/blazeface';
 import * as posenet from '@tensorflow-models/posenet';
 import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
 import { poseSimilarity } from './posenet_utils';
 import POSE_MAP from "./exercise";
 import RNFS from "react-native-fs";
 
 const minThreshold = 0.15;
 
 
 
 const BACKEND_TO_USE = 'rn-webgl';
 
 interface AppState {
   isTfReady: boolean;
   hasCameraPermission?: boolean;
   // tslint:disable-next-line: no-any
   cameraType: any;
   isLoading: boolean;
   posenetModel?: posenet.PoseNet;
   pose?: posenet.Pose;
   skippedFrame: number,
   // tslint:disable-next-line: no-any
   faceDetector?: any;
   // faces?: blazeface.NormalizedFace[];
   modelName: string;
   poseIdealStand?: posenet.Pose;
   poseIdealSquat?: posenet.Pose;
   isStanding: boolean;
   isSquat: boolean;
   isTransitionA: boolean;
   isTransitionB: boolean;
   isFirstTime: boolean;
 }
 
 let squatCount = 0;
 
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
       skippedFrame: 0,
       isStanding: false,
       isSquat: false,
       isTransitionA: false,
       isTransitionB: false,
       isFirstTime: true,
     };
     this.handleImageTensorReady = this.handleImageTensorReady.bind(this);
   }
 
   async loadPosenetModel() {
     const model = await posenet.load({
       architecture: 'MobileNetV1',
       // architecture: 'ResNet50',
       outputStride: 16,
       inputResolution: { width: inputTensorWidth, height: inputTensorHeight },
       multiplier: 1.0,
       quantBytes: 2
     });
     return model;
   }
 
 
   async handleImageTensorReady(
     images: IterableIterator<tf.Tensor3D>,
     updatePreview: () => void, gl: ExpoWebGLRenderingContext) {
     const loop = async () => {
       const { modelName } = this.state;
       if (!AUTORENDER) {
         updatePreview();
       }
 
       if (modelName === 'posenet') {
         if (this.state.posenetModel != null) {
           if (this.state.isFirstTime){
             const imageTensor = images.next().value;
             const flipHorizontal = Platform.OS === 'ios' ? false : true;
             const pose = await this.state.posenetModel.estimateSinglePose(
               imageTensor, { flipHorizontal });
             this.setState({ pose });   
             tf.dispose([imageTensor]);
             this.setState({
               isFirstTime: false
             })
           }
           if (this.state.skippedFrame > 0) {
             const imageTensor = images.next().value;
             const flipHorizontal = Platform.OS === 'ios' ? false : true;
             const pose = await this.state.posenetModel.estimateSinglePose(
               imageTensor, { flipHorizontal });
             this.setState({ pose });
             tf.dispose([imageTensor]);
             this.setState({
               skippedFrame: 0
             })
           }
           else {
             this.setState({
               skippedFrame: this.state.skippedFrame + 1
             })
           }
           const cosineDistanceStand = poseSimilarity(this.state.poseIdealStand, this.state.pose);
           const cosineDistanceSquat = poseSimilarity(this.state.poseIdealSquat, this.state.pose);
           if (cosineDistanceSquat < minThreshold) {
             this.setState({
               isSquat: true,
               isStanding: false,
             });
             // console.log(this.state.squatCount);
           }
           else if (cosineDistanceStand < minThreshold) {
             this.setState({
               isStanding: true,
               isSquat: false,
             });
           }
           else {
             this.setState({
               isStanding: false,
               isSquat: false,
             })
           }
           // console.log(pose.keypoints);
           
           if (this.state.isStanding == true){
             if (this.state.isTransitionA == false && this.state.isTransitionB == false) {
               this.setState({ isTransitionA: true });
             }
             else if (this.state.isTransitionA == true && this.state.isTransitionB == true) {
               squatCount = squatCount + 1;
               this.setState({
                 isTransitionA: false,
                 isTransitionB: false,
               })
             }
             this.setState({isStanding: false})
           }
           else if (this.state.isSquat == true) {
             if (this.state.isTransitionA == true && this.state.isTransitionB == false) {
               this.setState({
                 isTransitionB: true,
               });
             }
             this.setState({isStanding: false})
           }
 
           console.log("isTransitionA: " + this.state.isTransitionA)
           console.log("isSTransitionB: " + this.state.isTransitionB)
 
           console.log("isStanding: " + this.state.isStanding)
           console.log("isSquat: " + this.state.isSquat)
         }
       } 
 
       if (!AUTORENDER) {
         gl.endFrameEXP();
       }
       this.rafID = requestAnimationFrame(loop);
 
     };
 
     loop();
   }
 
 
   componentWillUnmount() {
     if (this.rafID) {
       cancelAnimationFrame(this.rafID);
     }
   }
 
   async componentDidMount() {
     await tf.setBackend(BACKEND_TO_USE);
     await tf.ready();
     const { status } = await Permissions.askAsync(Permissions.CAMERA);
 
     const [posenetModel] = await Promise.all([this.loadPosenetModel()]);
 
     const poseIdealStand = POSE_MAP["stand.jpg"];
     const poseIdealSquat = POSE_MAP["squat.jpg"];
 
     const flipHorizontal = Platform.OS === 'ios' ? false : true;
 
     this.setState({
       isTfReady: true,
       hasCameraPermission: status === 'granted',
       isLoading: false,
       posenetModel,
       poseIdealStand,
       poseIdealSquat,
     });
   }
 
 
   clearSquatCount() {
     squatCount = 0;
     this.setState({
       isStanding: false,
       isSquat: false,
       isTransitionA: false,
       isTransitionB: false,
     })
   }
 
   actionIdealFrame () {
     console.log(JSON.stringify(this.state.pose))
   }
 
 
   renderPose() {
     const MIN_KEYPOINT_SCORE = 0.2;
     const { pose } = this.state;
     if (pose != null) {
       const keypoints = pose.keypoints
         .filter(k => k.score > MIN_KEYPOINT_SCORE)
         .map((k, i) => {
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
           stroke="white"
           fontSize="30"
           fontWeight="bold"
           x="80"
           y="30"
           textAnchor="middle"
         >
           {squatCount}
         </svgComponents.Text>
 
         {/* <svgComponents.Text
           stroke="purple"
           fontSize="10"
           fontWeight="bold"
           x="80"
           y="25"
           textAnchor="middle"
         >
           {"isStanding: "+this.state.isStanding.toString()}
         </svgComponents.Text>
 
         <svgComponents.Text
           stroke="purple"
           fontSize="10"
           fontWeight="bold"
           x="80"
           y="40"
           textAnchor="middle"
         >
           {"isTranA: "+this.state.isTransitionA.toString()}
         </svgComponents.Text>
 
         <svgComponents.Text
           stroke="purple"
           fontSize="10"
           fontWeight="bold"
           x="80"
           y="55"
           textAnchor="middle"
         >
           {"isTranB: "+this.state.isTransitionB.toString()}
         </svgComponents.Text>
 
         <svgComponents.Text
           stroke="purple"
           fontSize="10"
           fontWeight="bold"
           x="80"
           y="70"
           textAnchor="middle"
         >
           {"isSquat: "+this.state.isSquat.toString()}
         </svgComponents.Text> */}
 
 
       </svgComponents.Svg>;
     } else {
       return null;
     }
   }
 
 
   render() {
     const { isLoading, modelName } = this.state;
 
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
         {modelName === 'posenet' ? this.renderPose() : null }
       </View>
       <View style={styles.controlSpace}>
         <TouchableHighlight
           style={styles.flipCameraBtn}
           onPress={() => { this.clearSquatCount(); }}
           underlayColor='#FFDE03'>
           <Text style={styles.textStyle}>
             START AGAIN
             </Text>
 
         </TouchableHighlight>
 
         <TouchableHighlight
           style={styles.idealFrameBtn}
           onPress={() => { this.actionIdealFrame(); }}
           underlayColor='#FFDE03'>
           <Text style={styles.textStyle}>
             SET EXERCISE 
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
             source={require('./assets/images/react-logo.png')}
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
     width: '100%',
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
   camera: {
     position: 'absolute',
     left: 45,
     top: 60,
     width: 600 / 2,
     height: 800 / 2,
     zIndex: 1,
     borderWidth: 1,
     borderColor: 'black',
     borderRadius: 0,
   },
   modelResults: {
     position: 'absolute',
     left: 45,
     top: 60,
     width: 600 / 2,
     height: 800 / 2,
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
     flexDirection: 'column',
     backgroundColor: '#F5F5F5',
     marginTop: 20,
     position: 'relative',
     width: '76%'
   },
   flipCameraBtn: {
     backgroundColor: '#424242',
     width: '100%',
     padding: 10,
     justifyContent: 'center',
     marginTop: 40,
     alignItems: 'center',
     borderColor: 'blue'
   },
   idealFrameBtn: {
     backgroundColor: '#424242',
     width: '100%',
     padding: 10,
     marginTop: 10,
     justifyContent: 'center',
     alignItems: 'center',
     borderColor: 'blue'
   },
 
 });
 
 export default App