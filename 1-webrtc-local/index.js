let localStream

const createLocalMediaStream = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  })
  document.getElementById('local').srcObject = localStream
}

const createPeerConnection = async () => {
  const peerA = new RTCPeerConnection()
  const peerB = new RTCPeerConnection()

  // 添加本地媒体流
  localStream.getTracks().forEach((track) => {
    peerA.addTrack(track, localStream)
  })

  // 监听 ice 候选项事件
  peerA.onicecandidate = (event) => {
    if (event.candidate) {
      peerB.addIceCandidate(event.candidate) // 设置 ice 候选项
    }
  }

  // 监听获取媒体数据（前提是peerA已添加了媒体流数据）
  peerB.ontrack = (event) => {
    document.getElementById('local-from-remote').srcObject = event.streams[0]
  }
  /**
   * 媒体协商（交换SDP）
   */
  const offer = await peerA.createOffer()
  await peerA.setLocalDescription(offer)

  await peerB.setRemoteDescription(offer)
  const answer = await peerB.createAnswer()
  await peerB.setLocalDescription(answer)

  await peerA.setRemoteDescription(answer)
}

const main = async () => {
  await createLocalMediaStream()
  await createPeerConnection()
}
main()
