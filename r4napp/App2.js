import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  Button,
  ActivityIndicator,
  StatusBar,
  Image,
  TouchableOpacity,
  PermissionsAndroid,
  Platform
} from 'react-native'
import * as tf from '@tensorflow/tfjs'
import * as jpeg from 'jpeg-js'
import * as ImagePicker from 'expo-image-picker'
import Constants from 'expo-constants'
import * as Permissions from 'expo-permissions'
import * as FileSystem from 'expo-file-system'
import {fetch} from '@tensorflow/tfjs-react-native'
import {FMNIST_CLASSES} from './FMNIST_classes'
import CameraRoll from '@react-native-community/cameraroll'
import fs from "react-native-fs";

import image1 from './assets/images/1.jpg'
import image2 from './assets/images/3.jpg'
import image3 from './assets/images/10.jpg'
import image4 from './assets/images/13.jpg'
import image5 from './assets/images/25.jpg'
import image6 from './assets/images/28.jpg'
import image7 from './assets/images/35.jpg'
import image8 from './assets/images/38.jpg'
import image9 from './assets/images/55.jpg'


// export const image1 = require('./assets/images/1.jpg')
// export const image2 = require('./assets/images/3.jpg')
// export const image3 = require('./assets/images/10.jpg')
// export const image4 = require('./assets/images/13.jpg')
// export const image5 = require('./assets/images/25.jpg')
// export const image6 = require('./assets/images/28.jpg')
// export const image7 = require('./assets/images/35.jpg')
// export const image8 = require('./assets/images/38.jpg')
// export const image9 = require('./assets/images/55.jpg')

const IMAGE_SIZE = 28
const inputMax = 1
const inputMin = -1
const normalizationConstant = (inputMax - inputMin) / 255.0

class App extends React.Component {
  state = {
    isTfReady: false,
    isModelReady: false,
    predictions: null,
    image: null,
    photos: null,
    isRefresh: false
  }

  async componentDidMount() {
    await tf.ready()
    this.setState({
      isTfReady: true
    })
    //tfjs custom loadgraph model
    // this.model = await tf.loadGraphModel('http://192.168.0.130:8080/model.json')
    this.model = await tf.loadGraphModel('https://raw.githubusercontent.com/Sabit-Ahmed/React-Native-Projects/main/DA2_FMNIST/output/web_model/model.json')

    // this.model = await tf.loadGraphModel('file:///assets/web_model/model.json') //error
    this.setState({ isModelReady: true })
    // this.hasAndroidPermission()
    // this.getImage()
  }


  // hasAndroidPermission = async () => {
  //   const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  
  //   const hasPermission = await PermissionsAndroid.check(permission)
  //   if (hasPermission) {
  //     return true;
  //   }
  
  //   const status = await PermissionsAndroid.request(permission)
  //   return status === 'granted';
  // }


  imageToTensor(rawImageData) {
    const TO_UINT8ARRAY = true
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY)
    console.log("Height: ---> "+height)
    console.log("Width: ---> "+width)

    // Drop the alpha channel info for mobilenet
    const buffer = new Uint8Array(width * height * 1)
    
    let offset = 0 // offset into original data
    for (let i = 0; i < buffer.length; i += 1) {
      buffer[i] = data[offset]
      buffer[i + 1] = data[offset + 1]
      buffer[i + 2] = data[offset + 2]

      offset += 4
    }
    console.log('Success imageToTensor!')

    return tf.tensor3d(buffer, [ height, width, 1])
  }


  classifyImage = async () => {
    try {
      console.log("Entered classifyImage method")
      const imageAssetPath = Image.resolveAssetSource(this.state.image)
      console.log(imageAssetPath)
      const fileUri = imageAssetPath.uri
      console.log("fileUri: ")
      console.log(fileUri)
      
      const imgB64 = await fs.readFileAssets(fileUri, "base64")
      console.log(imgB64)
      
      // const imgB64 = await FileSystem.readAsStringAsync(fileUri, {
      //   encoding: FileSystem.EncodingType.Base64,
      // })
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer
      const imageTensor = this.imageToTensor(imgBuffer)

      // Normalize the image from [0, 255] to [inputMin, inputMax].
      // console.log("Norm: --->"+normalizationConstant)
      const normalized = tf.add(
        tf.mul(tf.cast(imageTensor, 'float32'), normalizationConstant),
        inputMin);

      // Resize the image to
      let resized = normalized;
      if (imageTensor.shape[0] !== IMAGE_SIZE || imageTensor.shape[1] !== IMAGE_SIZE) {
        const alignCorners = true;
        resized = tf.image.resizeBilinear(
            normalized, [IMAGE_SIZE, IMAGE_SIZE], alignCorners);
      }

      // Reshape so we can pass it to predict.
      const batched = tf.reshape(resized, [-1, 1, IMAGE_SIZE, IMAGE_SIZE]);

      
      // for tfjs loadgraph model
      // const imageTensor = tf.zeros([1, 1, 28, 28])

      const logits1001 = await this.model.predict(batched)
      
      const logits = logits1001
      const topk = 1
      const predictions = await this.getTopKClasses(logits, topk);

      logits.dispose();
      console.log("predictions: --->"+predictions)


      this.setState({ predictions })
      console.log("Here")
    } catch (error) {
      console.log("\nclassifyImage method error: --->"+error)
    }
  }


  getTopKClasses = async (logits, topK) => {
    const softmax = tf.softmax(logits);
    const values = await softmax.data();
    softmax.dispose();

    const valuesAndIndices = [];
    for (let i = 0; i < values.length; i++) {
      valuesAndIndices.push({value: values[i], index: i});
    }
    valuesAndIndices.sort((a, b) => {
      return b.value - a.value;
    });
    const topkValues = new Float32Array(topK);
    const topkIndices = new Int32Array(topK);
    for (let i = 0; i < topK; i++) {
      topkValues[i] = valuesAndIndices[i].value;
      topkIndices[i] = valuesAndIndices[i].index;
    }

    const topClassesAndProbs = [];
    for (let i = 0; i < topkIndices.length; i++) {
      topClassesAndProbs.push({
        className: FMNIST_CLASSES[topkIndices[i]],
        probability: topkValues[i]
      });
    }
    return topClassesAndProbs;
  }


  // getRandomImage = async () => {
  //   if (Platform.OS === "android" && !(await this.hasAndroidPermission())) {
  //     return;
  //   }
  //   CameraRoll.getPhotos({first: 5})
  //     .then(data => {
  //       console.log(data)
  //       const assets = data.edges
  //       const images = assets.map((asset) => asset.node.image)
  //       console.log("image length: "+images.length)
  //       const random = Math.floor(Math.random() * images.length)
  //       console.log(random)
  //       this.setState({
  //         photos: images[random]
  //       })
  //       console.log("Displayimg --->"+photos)
  //     })
  //     .catch(err => console.log)
  // }


  // getImage = async () => {
  //   if (Platform.OS === "android" && !(await this.hasAndroidPermission())) {
  //     return;
  //   }
  //   CameraRoll.getPhotos({
  //     first: 9,
  //     assetType: 'Photos',
  //   })
  //   .then(r => {
  //     console.log(r)
  //     this.setState({ photos: r.edges });
  //   })
  //   .catch((err) => {
  //      console.log
  //   });
  // };


  // getRefresh = async() => {
  //   this.setState({isRefresh: this.getImage()})
  // }
  
  // imageList = [{id: "1", source: require('./assets/images/1.jpg')},
  // {id: "2", source: require('./assets/images/3.jpg')},
  // {id: "3", source: require('./assets/images/10.jpg')},
  // {id: "4", source: require('./assets/images/13.jpg')},
  // {id: "5", source: require('./assets/images/25.jpg')},
  // {id: "6", source: require('./assets/images/28.jpg')},
  // {id: "7", source: require('./assets/images/35.jpg')},
  // {id: "8", source: require('./assets/images/38.jpg')},
  // {id: "9", source: require('./assets/images/55.jpg')},
  // ]

  imageList = [
    {id: "1", source: image1},
    {id: "2", source: image2},
    {id: "3", source: image3},
    {id: "4", source: image4},
    {id: "5", source: image5},
    {id: "6", source: image6},
    {id: "7", source: image7},
    {id: "8", source: image8},
    {id: "9", source: image9}
  ]

 pressedImage = async(pressed) => {
  console.log(pressed.source)
  this.setState({image: pressed.source})
  setTimeout(() => {
    console.log(this.state.image)
    this.classifyImage()
  }, 1000)
  
 }



  renderPrediction = prediction => {
    return (
      <Text key={prediction.className} style={styles.text}>
        {prediction.className}
      </Text>
    )
  }

  render() {
    const { isTfReady, isModelReady, predictions, image } = this.state

    return (
      <View style={styles.container}>
        {/* <View style={styles.container}>
          { this.state.Displayimg ?
            <Image
              style={styles.imageContainer}
              source={{ uri: this.state.Displayimg.uri }}
            />
            : null
          }
          <Button title="Get Random Image from CameraRoll" onPress={this.getRandomImage}/>
        </View> */}

      
        {/* <View style={styles.dispImgContainer}>
          {this.state.photos ? 
          <FlatList
            
            data={this.state.photos}
            renderItem={({ item }) => (
              <TouchableOpacity>
                <Image
                  style={styles.imageContainer}
                  source={{ uri: item.node.image.uri }}
                />
              </TouchableOpacity>
              
            )}
            //Setting the number of column
            numColumns={3}
            keyExtractor={(item, index) => index.toString()}
          />
          : null}
          <Button title="Refresh" onPress={this.getRefresh} />
        </View> */}

        { image ? 
          <View style={styles.imageWrapper}>
            <Image source={image} style={styles.imageContainer} />
          </View>
        : null}

        <View style={styles.predictionWrapper}>
          {isModelReady && image && (
            <Text style={styles.text}>
              Predictions: {predictions ? '' : 'Predicting...'}
            </Text>
          )}
          {isModelReady &&
            predictions &&
            predictions.map(p => this.renderPrediction(p))}
        </View>

        <View style={styles.dispImgContainer}>
          <FlatList
            keyExtractor={(item) => item.id}
            numColumns={3}
            data={this.imageList}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => this.pressedImage(item)}>
                <Image
                  style={styles.photosContainer}
                  source={item.source}
                  
                />
              </TouchableOpacity>
            )}
          />
        </View>

      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171f24',
    alignItems: 'center'
  },
  imageWrapper: {
    width: 220,
    height: 220,
    padding: 5,
    borderColor: '#cf667f',
    borderWidth: 5,
    borderStyle: 'dashed',
    marginTop: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: 200,
    height: 200,
    position: 'absolute',
    top: 10,
    left: 10,
    bottom: 10,
    right: 10
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 20,
    position: 'relative'
  },
  predictionWrapper: {
    height: 100,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center'
  },
  transparentText: {
    color: '#ffffff',
    opacity: 0.7
  },
  dispImgContainer: {
    marginTop: 300,
    position: 'absolute'
  },
  photosContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    marginTop: 20,
    marginRight: 20,
    top: 5,
    left: 5,
    bottom: 5,
    right: 5
  },

  footer: {
    marginTop: 40,
  },

})

export default App