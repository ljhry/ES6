import React, { Component } from 'react'
import {Platform, StyleSheet, Text, View,TouchableOpacity,Image,
  AsyncStorage,

} from 'react-native';
import {createStackNavigator} from 'react-navigation'
import Icon from "react-native-vector-icons/Ionicons";
import ImagePicker from "react-native-image-picker";
import sha1 from "sha1";
import Videomp4 from "react-native-video";
import * as Progress from "react-native-progress";
const config = require("../common/config");
const request = require("../common/request");
const Dimensions = require("Dimensions");
const {width} = Dimensions.get('window')
const {height} = Dimensions.get('window')

var options = {
  title: "选择视频",
  cancelButtonTitle: "取消",
  takePhotoButtonTitle: "录制10s视频",
  chooseFromLibraryButtonTitle: "选择已有视频",
  cameraType: "back",
  mediaType: "photo",
  videoQuality: "medium",
  mediaType:"video",
  durationLimit: 10,
  aspectX: 2,
  aspectY: 1,
  maxWidth: 700, // 加了这两句控制大小
  maxHeight: 700, // 加了这两句控制大小
  noData: false,
  storageOptions: {
    skipBackup: true,
    path: "images"
  }
};
export default class AddVideo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      previewVideo:null,
      rate: 1,
      muted: true,
      resizeMode: "contain",
      repeat: false,
      videoReady: false,
      videoUploadedProgress: 0.90,
      videoTotal: 0,
      currentTime: 0,
      playing: false,
      paused: false,
      videoOk: true,
      content: "",
      isSending: false,
      KeyboardShown: false,
      videoLoaded:false,
      videoUploading:false,
    }
    this._pickVideo = this._pickVideo.bind(this)
    this._onProgress = this._onProgress.bind(this);
    this._onEnd = this._onEnd.bind(this);
    this._rePlay = this._rePlay.bind(this);
    this._pause = this._pause.bind(this);
    this._resume = this._resume.bind(this);
    this._onError = this._onError.bind(this);
    // this._fetchData = this._fetchData.bind(this);
    // this._submit = this._submit.bind(this);
  }
  componentDidMount() {
    let that = this;
    AsyncStorage.getItem("user").then(data => {
      let user;
      if (data) {
        user = JSON.parse(data);
        console.log('用户信息缓存：',user);
      }
      if (user && user.accessToken) {
        that.setState({
          user: user
        });
      }
    });
  }
  getQiniuToken(){
    let accessToken = this.state.user.accessToken;
    let signatureURL = config.api.base + config.api.signature;
    return request
    .post(signatureURL, {
      accessToken: accessToken,
      cloud:'qiniu',
      type: "video"
    })
    .catch(err => {
      console.log(err);
    })
  }
  _pickVideo() {
    let that = this;
    ImagePicker.showImagePicker(options, res => {
      // console.log('res = ', res);
      if (res.didCancel) {
        // console.log('User cancelled image picker');s
        return;
      } else if (res.error) {
        console.log("ImagePicker Error: ", res.error);
      } else if (res.customButton) {
        console.log("User tapped custom button: ", res.customButton);
      } else {
        // You can display the image using either data:
        const avatarData = {uri: 'data:image/jpeg;base64,' + res.data, isStatic: true};

        // let avatarData = "data:image/jpeg;base64" + res.data
        // let user = that.state.user;
        // user.avatar = res.uri;
        // that.setState({
        //   user: user
        // });
        let uri = res.uri
        that.setState({
          previewVideo:uri
        })
        console.log('193 '+uri)
        that.getQiniuToken()
          .then((data) => {
            if (data && data.success) {
              console.log('200',data);
              let token = data.data.token
              let key = data.data.key
              let body = new FormData();
              body.append("token", token);
              body.append("key", key);
              body.append("file", {
                type:'video/mp4',
                uri:uri,
                name:key
              });
              that._upload(body);
            }
          })
      }
    });
  }
  _upload(body) {
    console.log("220", body);
    let that = this;
    let xhr = new XMLHttpRequest();
    let url = config.qiniu.upload
    let user = that.state.user

    // console.log(url);
    that.setState({
      videoUploading: true,
      vodeoUploaded: false,
      user:user
    });
    xhr.open("POST", url);
    xhr.onload = () => {
      if (xhr.status !== 200) {
        alert("请求失败1");
        console.log(xhr.responseText);
        return;
      }
      if (!xhr.responseText) {
        alert("请求失败2");
        return;
      }
      let response;
      try {
        response = JSON.parse(xhr.response);
        console.log(response);
      } catch (e) {
        console.log(e);
        console.log("失败");
      }
      if (response) {
        // user.avatar = response.key;
        that.setState({
          video:response,
          videoUploading: false,
          videoUploaded: true,
        });
      }
    };
    if (xhr.upload) {
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          let percent = Number((event.loaded / event.total).toFixed(2));
          that.setState({
            videoUploadedProgress: percent
          });
        }
      };
    }
    xhr.send(body);
  }
  _onLoadStart() {
    console.log("a");
  }
  _onLoad() {
    console.log("a");
  }
  _onProgress(data) {
    //   console.log(data)
    if (!this.state.videoReady) {
      this.setState({
        videoReady: true
      });
    }
  }
  _onEnd() {
    this.setState({
      videoProgress: 1,
      playing: false
    });
  }
  _onError() {
    this.setState({
      videoOk: false
    });
  }
  _rePlay() {
    this.refs.VideoPlayer.seek(0);
  }
  _pause() {
    if (!this.state.paused) {
      this.setState({
        paused: true
      });
    }
  }
  _resume() {
    if (this.state.paused) {
      this.setState({
        paused: false
      });
    }
  }
  
  render() {
    return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
            {this.state.previewVideo?'点击按钮配音':'理解狗狗，从配音开始'}</Text>
            <TouchableOpacity style={{marginRight:12}} onPress={this._pickVideo}>
            <Text style={{fontSize:15,color:'#fff'}}>更换视频</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.page}>
            {
              this.state.previewVideo?
              <View style={styles.videoContainer}>
                <View style={styles.videoBox}>
                <Videomp4
                  ref="VideoPlayer"
                  source={{ uri: this.state.previewVideo}}
                  style={styles.video}
                  volume={5}
                  paused={this.state.paused}
                  rate={this.state.rate}
                  muted={this.state.muted}
                  resizeMode={this.state.resizeMode}
                  repeat={this.state.repeat}
                  resizeMode="cover"
                  onLoadStart={this._onLoadStart}
                  onLoad={this._onLoad}
                  onProgress={this._onProgress}
                  onEnd={this._onEnd}
                  onError={this._onError}
            />
            {
              !this.state.videoLoaded && this.state.videoUploading
              ?<View style={styles.progressTipBox}>
                <Progress.Bar
                  showsText={true}
                  color={"#3498db"}
                  progress={this.state.videoUploadedProgress}
                />
                <Text style={styles.progressTip}>正在生成静音视频,已经完成{(this.state.videoUploadedProgress *100).toFixed(2)}%</Text>
              </View>:null
            }
            {/* <View style={styles.progressTipBox}>
                <Progress.Bar
                  showsText={true}
                  color={"#3498db"}
                  progress={this.state.videoUploadedProgress}
                />
                <Text style={styles.progressTip}>正在生成静音视频,已经完成{(this.state.videoUploadedProgress *100).toFixed(2)}%</Text>
              </View> */}
                </View>
              </View>
              :<TouchableOpacity style={styles.uploadContainer}
                onPress={this._pickVideo}>
                <View style={styles.uploadBox}>
                  <Image source={require('../../images/上传视频.png')} style={styles.uploadIcon}></Image>
                  <Text style={styles.uploadTitle}>点我上传视频</Text>
                  <Text style={styles.uploadDesc}>建议时间不超过10s</Text>
                </View>

              </TouchableOpacity>
            }
          </View>
        </View>
    )
  }
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5FCFF',
    },
    header:{
      height: width/6.5,
      backgroundColor: '#3498db',
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headerTitle:{
      color:'#fff',
      fontSize:19,
      fontWeight: 'bold',
      marginLeft: 12,
    },
    page:{
      flex:1,
      alignItems:'center'
    },
    uploadContainer:{
      marginTop:30,
      backgroundColor:'#fff',
      width:width-30,
      height:230,
      borderRadius: 6,
      justifyContent:'center',
      borderWidth: 1,
      borderColor: '#3498db',
    },
    uploadTitle:{
      marginBottom:10,
      textAlign:'center',
      fontSize:16,
      color:'#000'
    },
    uploadDesc:{
      color:'#999',
      textAlign:'center',
      fontSize:12
    },
    uploadIcon:{
      width:110,
      height:110,
      resizeMode:'contain'
    },
    uploadBox:{
      flex:1,
      justifyContent:'center',
      alignItems:'center'
    },
    videoContainer:{
      width:width,
      justifyContent:'center',
      alignItems:'flex-start'
    },
    videoBox:{
      width:width,
      height:height * 0.4
    },
    video:{
      width:width,
      height:height*0.4,
      backgroundColor:'#333'
    },
    progressTipBox:{
      marginTop:10,
      width:width,
      alignItems:'center',
      height:30,
      backgroundColor:'rgba(244,244,244,0.65)'
    },
    progressTip:{
      color:'#333',
      width:width - 10,
      padding: 5,
      textAlign:'center'
    },
});

