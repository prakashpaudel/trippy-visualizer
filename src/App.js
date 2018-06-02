import React, { Component } from 'react'
import './App.css'

class App extends Component {
  componentDidMount() {
    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {}
    }

    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = function(constraints) {
        // First get ahold of the legacy getUserMedia, if present
        var getUserMedia =
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
          return Promise.reject(
            new Error('getUserMedia is not implemented in this browser')
          )
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function(resolve, reject) {
          getUserMedia.call(navigator, constraints, resolve, reject)
        })
      }
    }

    // set up forked web audio context, for multiple browsers
    // window. is needed otherwise Safari explodes

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    var source

    //set up the different audio nodes we will use for the app

    var analyser = audioCtx.createAnalyser()
    analyser.minDecibels = -90
    analyser.maxDecibels = -10
    analyser.smoothingTimeConstant = 0.85

    var distortion = audioCtx.createWaveShaper()
    var gainNode = audioCtx.createGain()
    var biquadFilter = audioCtx.createBiquadFilter()
    var convolver = audioCtx.createConvolver()

    // set up canvas context for visualizer

    var canvas = document.querySelector('.visualizer')
    console.log('canvas', canvas)
    var canvasCtx = canvas.getContext('2d')

    var intendedWidth = document.querySelector('.wrapper').clientWidth

    canvas.setAttribute('width', intendedWidth)

    var drawVisual

    //main block for doing the audio recording

    if (navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia supported.')
      var constraints = { audio: true }
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function(stream) {
          source = audioCtx.createMediaStreamSource(stream)
          source.connect(analyser)
          analyser.connect(distortion)
          distortion.connect(biquadFilter)
          biquadFilter.connect(convolver)
          convolver.connect(gainNode)
          gainNode.connect(audioCtx.destination)

          visualize()
        })
        .catch(function(err) {
          console.log('The following gUM error occured: ' + err)
        })
    } else {
      console.log('getUserMedia not supported on your browser!')
    }

    function visualize() {
      const WIDTH = canvas.width
      const HEIGHT = canvas.height

      analyser.fftSize = 2048
      var bufferLength = analyser.fftSize
      console.log(bufferLength)
      var dataArray = new Uint8Array(bufferLength)

      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT)

      var draw = function() {
        drawVisual = requestAnimationFrame(draw)

        analyser.getByteTimeDomainData(dataArray)

        canvasCtx.fillStyle = 'rgb(200, 200, 200)'
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT)

        canvasCtx.lineWidth = 2
        canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

        canvasCtx.beginPath()

        var sliceWidth = WIDTH * 1.0 / bufferLength
        var x = 0

        for (var i = 0; i < bufferLength; i++) {
          var v = dataArray[i] / 128.0
          var y = v * HEIGHT / 2

          if (i === 0) {
            canvasCtx.moveTo(x, y)
          } else {
            canvasCtx.lineTo(x, y)
          }

          x += sliceWidth
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2)
        canvasCtx.stroke()
      }

      draw()
    }
  }

  render() {
    return (
      <div className="wrapper">
        <p>here</p>
        <canvas class="visualizer" width="640" height="100" />
      </div>
    )
  }
}

export default App
