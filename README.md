# React-Native-Projects

Tried to use a pretrained model (Mobilenet) with react-native cli.
### Important Links:
https://dev.to/amanhimself/image-classification-on-react-native-with-tensorflow-js-and-mobilenet-dpc
https://github.com/amandeepmittal/mobilenet-tfjs-expo
https://github.com/tensorflow/tfjs/tree/master/tfjs-react-native
https://github.com/tensorflow/tfjs/tree/master/tfjs-react-native/integration_rn59
https://www.linkedin.com/pulse/real-time-image-classification-tensorflow-daniel-wind
https://blog.tensorflow.org/2021/01/custom-object-detection-in-browser.html
http://blog.zenof.ai/object-detection-in-react-native-app-using-tensorflow-js/
https://medium.com/zenofai/serverless-web-application-architecture-using-react-with-amplify-part1-5b4d89f384f7

Pretrained model usage example with expo-cli: https://dev.to/amanhimself/image-classification-on-react-native-with-tensorflow-js-and-mobilenet-dpc

Vital issues:
expo-cli is not used. Instead, react-native-cli has been used.
tfjs/tfjs-react-native requires expo-gl, expo-gl-cpp and expo-camera. So we have to use expo-cli anyway. If not directly, indirectly.
Expo-cli provides built-in modules and manages various tfjs related packages. But expo-cli results build or debug failure. On contrast, with react-native-cli, we have to set up the project environment manually. 
Steps of using tfjs with react-native is tedious and described below with link:
steps link: https://github.com/tensorflow/tfjs/tree/master/tfjs-react-native

## Steps

## Step 1. Create your react native app.
You can use the React Native CLI or Expo.

On macOS (to develop iOS applications) You will also need to use CocoaPods to install these dependencies.

## Step 2: Install dependencies
Note that if you are using in a managed expo app the install instructions may be different.

#### Install and configure react-native-unimodules (can be skipped if in an expo app)
It requires installing `react-native-unimodules` and modifying four files:
    1. android/app/build.gradle
    2. android/app/src/main/java/com/myapp/MainApplication.java
    3. android/build.gradle
    4. android/settings.gradle
### Install and configure expo-gl-cpp and expo-gl
#### Install and configure expo-camera
#### Install and configure async-storage
It creates an issue: Doc says to install `@react-native-async-storage/async-storage`, but the project requires `@react-native-community/async-storage`. May be caused by backdated expo libraries.
#### Install and configure react-native-fs
It requires modifying three files:
    1. android/settings.gradle
    2. android/app/build.gradle
    3. MainApplication.java          
#### Install @tensorflow/tfjs - npm install @tensorflow/tfjs
#### Install @tensorflow/tfjs-react-native - npm install @tensorflow/tfjs-react-native

## Step 3: Configure Metro
This step is only needed if you want to use the bundleResourceIO loader.
Edit your metro.config.js to look like the following. Changes are noted in the comments below.

    const { getDefaultConfig } = require('metro-config');
    module.exports = (async () => {
      const defaultConfig = await getDefaultConfig();
      const { assetExts } = defaultConfig.resolver;
      return {
        resolver: {
          // Add bin to assetExts
          assetExts: [...assetExts, 'bin'],
        }
      };
    })();
## Step 4: Test that it is working
Before using tfjs in a react native app, you need to call tf.ready() and wait for it to complete. This is an async function so you might want to do this in a componentDidMount or before the app is rendered.



## Important issues:
### 1. tfjs/tfjs-react-native project requires Android NDK. It must be installed and included on the path.
    Link: https://github.com/expo/expo/issues/4483

### 2. WARN     Constants.manifest is null because the embedded app.config could not be read. Ensure that you have installed the expo-constants build scripts if you need to read from Constants.manifest.
    Tried to fix it by installing `expo-constants` package. But it hasn't fixed.
### 3. TypeError: undefined is not an object (evaluating 'a.substr')
    Solution: Downgrading @tensorflow/tfjs@3.3.0 to @tensorflow/tfjs@3.0.0
### 4. [Error: The highest priority backend 'rn-webgl' has not yet been initialized. Make sure to await tf.ready() or await tf.setBackend() before calling other methods]
    Solution: Makeing sure to await tf.ready() or await tf.setBackend() before calling other methods]
    
### 5. App/ Emulator crashes after picking the image.
    Reason: Hadn't given the permission to write in external storage. And expo-image-picker requires editing AndroidManifest.xml file.
    Link: https://github.com/expo/expo/tree/master/packages/expo-image-picker

    Solution:
    Add permissions on AndroidManifest.xml file:
     <!-- Added permissions -->
     <uses-permission android:name="android.permission.CAMERA" />
     <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
     <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    And add these lines in <application></application> :
    <activity
      android:name="com.theartofdev.edmodo.cropper.CropImageActivity"
      android:theme="@style/Base.Theme.AppCompat">
    </activity>

### 6. undefined (if ImagePicker.getPendingResultAsync() is used instead of ImagePicker.launchImageLibraryAsync())
     Solution: Must be used ImagePicker.launchImageLibraryAsync()
     
### 7. TypeError: Network request failed when using `const response = await fetch(imageAssetPath.uri, {}, { isBinary: true })`
       Solution: Not using tfjs-react-native/fetch, instead use `expo-file-system`.
       Link: https://github.com/tensorflow/tfjs/issues/3186
       Detailed solution:
        Change:
        const response = await fetch(imageAssetPath.uri, {}, { isBinary: true })
        const rawImageData = await response.arrayBuffer()

        To:
        const fileUri = imageAssetPath.uri;      
        const imgB64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        });
        const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
