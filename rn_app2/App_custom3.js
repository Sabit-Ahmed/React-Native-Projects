/// Error

import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  StatusBar,
  Image,
  TouchableOpacity,
  Platform
} from 'react-native'
import * as tf from '@tensorflow/tfjs'
import * as jpeg from 'jpeg-js'
import * as ImagePicker from 'expo-image-picker'
import Constants from 'expo-constants'
import * as Permissions from 'expo-permissions'
import * as FileSystem from 'expo-file-system'
import {fetch} from '@tensorflow/tfjs-react-native'
import {IMAGENET_CLASSES} from './imagenet_classes'

const IMAGE_SIZE = 224
const inputMax = 1
const inputMin = -1
const normalizationConstant = (inputMax - inputMin) / 255.0

class App extends React.Component {
  state = {
    isTfReady: false,
    isModelReady: false,
    predictions: null,
    image: null,
  }

  async componentDidMount() {
    await tf.ready()
    this.setState({
      isTfReady: true
    })
    //tfjs custom loadgraph model
    this.model = await tf.loadLayersModel('http://192.168.0.130:8080/model.json')

    // this.model = await tf.loadGraphModel('file:///assets/web_model/model.json') //error
    this.setState({ isModelReady: true })
    this.getPermissionAsync()
  }


  getPermissionAsync = async () => {
    if (Constants.platform.ios) {
      const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL)
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!')
      }
    }
  }

  imageToTensor(rawImageData) {
    const TO_UINT8ARRAY = true
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY)
    

    // Drop the alpha channel info for mobilenet
    const buffer = new Uint8Array(width * height * 3)
    
    let offset = 0 // offset into original data
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset]
      buffer[i + 1] = data[offset + 1]
      buffer[i + 2] = data[offset + 2]

      offset += 4
    }
    console.log('Success imageToTensor!')

    return tf.tensor3d(buffer, [ height, width, 3])
  }

  classifyImage = async () => {
    try {
      console.log("Entered classifyImage method")
      const imageAssetPath = Image.resolveAssetSource(this.state.image)
      console.log("\nimageAssetPath --->"+imageAssetPath)
      
      const fileUri = imageAssetPath.uri;      
      const imgB64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
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
      const batched = tf.reshape(resized, [-1, IMAGE_SIZE, IMAGE_SIZE, 3]);

      
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
        className: IMAGENET_CLASSES[topkIndices[i]],
        probability: topkValues[i]
      });
    }
    return topClassesAndProbs;
  }


  selectImage = async () => {
    try {
      let response = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      })
      console.log(response.uri)

      if (!response.cancelled) {
        const source = { uri: response.uri }
        this.setState({ image: source })
        this.classifyImage()
      }
    } catch (error) {
      console.log("selectImage method error --->"+error)
    }
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
        <StatusBar barStyle='light-content' />
        <View style={styles.loadingContainer}>
          <Text style={styles.text}>
            TFJS ready? {isTfReady ? <Text>✅</Text> : ''}
          </Text>

          <View style={styles.loadingModelContainer}>
            <Text style={styles.text}>Model ready? </Text>
            {isModelReady ? (
              <Text style={styles.text}>✅</Text>
            ) : (
              <ActivityIndicator size='small' />
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.imageWrapper}
          onPress={isModelReady ? this.selectImage : undefined}>
          {image && <Image source={image} style={styles.imageContainer} />}

          {isModelReady && !image && (
            <Text style={styles.transparentText}>Tap to choose image</Text>
          )}
        </TouchableOpacity>
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
        <View style={styles.footer}>
          <Text style={styles.poweredBy}>Powered by:</Text>
          <Image source={require('./assets/tfjs.jpg')} style={styles.tfLogo} />
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
  loadingContainer: {
    marginTop: 80,
    justifyContent: 'center'
  },
  text: {
    color: '#ffffff',
    fontSize: 16
  },
  loadingModelContainer: {
    flexDirection: 'row',
    marginTop: 10
  },
  imageWrapper: {
    width: 280,
    height: 280,
    padding: 10,
    borderColor: '#cf667f',
    borderWidth: 5,
    borderStyle: 'dashed',
    marginTop: 40,
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageContainer: {
    width: 250,
    height: 250,
    position: 'absolute',
    top: 10,
    left: 10,
    bottom: 10,
    right: 10
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
  footer: {
    marginTop: 40
  },
  poweredBy: {
    fontSize: 20,
    color: '#e69e34',
    marginBottom: 6
  },
  tfLogo: {
    width: 125,
    height: 70
  }
})

export default App