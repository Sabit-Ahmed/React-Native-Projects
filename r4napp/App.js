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
import * as RNFS from "react-native-fs";


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
  }


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

      const imgB64 = await RNFS.readFileRes(fileUri+'.png', 'base64') // On Android, use "RNFS.DocumentDirectoryPath" (MainBundlePath is not defined)
    
      
      // const imgB64 = await RNFS.readFileAssets(fileUri+'.jpg', "base64")
      console.log('GOT RESULT', imgB64);
      
      // const imgB64 = await FileSystem.readAsStringAsync(fileUri, {
      //   encoding: FileSystem.EncodingType.Base64,
      // })
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer
      console.log("imgBuffer done", imgBuffer)
      
      const imageTensor = this.imageToTensor(imgBuffer)
      console.log("imageTensor done")
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
      console.log(predictions)


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



  imageList = [
    {id: "1", source: {uri: 'img1'}},
    {id: "2", source: {uri: 'img3'}},
    {id: "3", source: {uri: 'img10'}},
    {id: "4", source: {uri: 'img13'}},
    {id: "5", source: {uri: 'img25'}},
    {id: "6", source: {uri: 'img28'}},
    {id: "7", source: {uri: 'img35'}},
    {id: "8", source: {uri: 'img38'}},
    {id: "9", source: {uri: 'img55'}},
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
