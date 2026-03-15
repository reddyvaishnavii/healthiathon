import { useAnimations, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import React, { useEffect, useMemo, useRef, useState } from "react"

import * as THREE from "three"
import { useSpeech } from "../hooks/useSpeechAvatar"
import facialExpressions from "../constants/facialExpressions"
import visemesMapping from "../constants/visemesMapping"
import morphTargets from "../constants/morphTargets"

function filterClipsToAvatarRig(animations, scene) {
  if (!scene || !animations?.length) return animations || []
  const nodeNames = new Set()
  scene.traverse((obj) => nodeNames.add(obj.name))
  return animations.map((clip) => {
    const validTracks = clip.tracks.filter((track) => {
      const nodeName = track.name.split(".")[0]
      return nodeNames.has(nodeName)
    })
    if (validTracks.length === 0) return new THREE.AnimationClip(clip.name, 0, [])
    return new THREE.AnimationClip(clip.name, clip.duration, validTracks)
  })
}

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF("/models/avatar.glb")
  const { animations: rawAnimations } = useGLTF("/models/animations.glb")
  const animations = useMemo(
    () => filterClipsToAvatarRig(rawAnimations || [], scene),
    [rawAnimations, scene]
  )
  const { message, onMessagePlayed } = useSpeech()
  const [lipsync, setLipsync] = useState()
  const [setupMode, setSetupMode] = useState(false)

  useEffect(() => {
    if (!message) {
      console.log('🔄 Avatar3D: No message, setting to Idle')
      setAnimation("Idle")
      return
    }
    console.log('🎬 Avatar3D: New message received:', {
      text: message.text?.substring(0, 30),
      hasAudio: !!message.audio,
      hasLipsync: !!message.lipsync,
      animation: message.animation,
      expression: message.facialExpression,
    })
    
    setAnimation(message.animation)
    setFacialExpression(message.facialExpression)
    setLipsync(message.lipsync)
    
    if (message.audio) {
      try {
        console.log('🎵 Avatar3D: Creating audio from base64, length:', message.audio.length)
        const audio = new Audio("data:audio/mp3;base64," + message.audio)
        setAudio(audio)
        audio.onended = onMessagePlayed
        audio.onerror = () => {
          console.warn("Avatar: audio failed to play, advancing to next message")
          onMessagePlayed()
        }
        
        // Delay audio start by 300ms to let user see the text appears first
        setTimeout(() => {
          console.log('▶️ Avatar3D: Starting audio playback (delayed 300ms)')
          audio.play().catch((err) => {
            console.warn("Avatar: play() failed", err)
            onMessagePlayed()
          })
        }, 300)
      } catch (err) {
        console.warn("Avatar: invalid audio data", err)
        onMessagePlayed()
      }
    } else {
      console.warn('⚠️ Avatar3D: No audio in message')
      setAudio(undefined)
      onMessagePlayed()
    }
  }, [message])

  const group = useRef()
  const { actions, mixer } = useAnimations(animations, group)
  const [animation, setAnimation] = useState(
    animations?.find((a) => a.name === "Idle") ? "Idle" : animations?.[0]?.name ?? "Idle"
  )
  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        .reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play()
      return () => {
        if (actions[animation]) {
          actions[animation].fadeOut(0.5)
        }
      }
    }
  }, [animation])

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target]
        if (index === undefined || child.morphTargetInfluences[index] === undefined) {
          return
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        )
      }
    })
  }

  const [blink, setBlink] = useState(false)
  const [facialExpression, setFacialExpression] = useState("")
  const [audio, setAudio] = useState()

  // Auto-sync expressions with conversation - improved selection based on context
  useEffect(() => {
    if (!message?.facialExpression) return
    
    const expressionMap = {
      smile: "smile",
      happy: "smile",
      sad: "sad",
      angry: "angry",
      surprised: "surprised",
      confused: "funnyFace",
      funnyFace: "funnyFace",
      default: "default",
    }
    
    const selectedExpression = expressionMap[message.facialExpression] || "default"
    setFacialExpression(selectedExpression)
  }, [message?.facialExpression])

  useFrame(() => {
    !setupMode &&
      morphTargets.forEach((key) => {
        const mapping = facialExpressions[facialExpression]
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return // eyes wink/blink are handled separately
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1)
        } else {
          lerpMorphTarget(key, 0, 0.1)
        }
      })

    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5)
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5)

    if (setupMode) {
      return
    }

    const appliedMorphTargets = []
    if (message && lipsync && audio) {
      const currentAudioTime = audio.currentTime
      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const mouthCue = lipsync.mouthCues[i]
        if (currentAudioTime >= mouthCue.start && currentAudioTime <= mouthCue.end) {
          appliedMorphTargets.push(visemesMapping[mouthCue.value])
          lerpMorphTarget(visemesMapping[mouthCue.value], 1, 0.2)
          break
        }
      }
    } else if (message && lipsync && !audio) {
      console.warn('⚠️ Avatar: Has message & lipsync but no audio playing')
    } else if (message && !lipsync) {
      console.warn('⚠️ Avatar: Has message but no lipsync data')
    }

    Object.values(visemesMapping).forEach((value) => {
      if (appliedMorphTargets.includes(value)) {
        return
      }
      lerpMorphTarget(value, 0, 0.1)
    })
  })

  // Removed Leva debug panel for production use

  useEffect(() => {
    let blinkTimeout
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true)
        setTimeout(() => {
          setBlink(false)
          nextBlink()
        }, 200)
      }, THREE.MathUtils.randInt(1000, 5000))
    }
    nextBlink()
    return () => clearTimeout(blinkTimeout)
  }, [])

  return (
    <group {...props} dispose={null} ref={group} position={[0, -2.2, 0]} scale={1.4}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Glasses.geometry}
        material={materials.Wolf3D_Glasses}
        skeleton={nodes.Wolf3D_Glasses.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Headwear.geometry}
        material={materials.Wolf3D_Headwear}
        skeleton={nodes.Wolf3D_Headwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
    </group>
  )
}

// Export as Avatar3D for consistency
export { Avatar as Avatar3D }

useGLTF.preload("/models/avatar.glb")
