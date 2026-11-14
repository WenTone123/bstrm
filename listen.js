"use strict";
const $ = id => document.getElementById(id);
const groups = window.BSTRM_SAMPLES;
const audio = $("audio");
const groupKeys = Object.keys(groups);
let state = {group: groupKeys[0], sample: 0, track: 0};
let position = 0, wantsPlayback = false, sourceVersion = 0;
const group = () => groups[state.group];
const sample = () => group().samples[state.sample];
const timeLabel = value => "0:" + String(Math.floor(value || 0)).padStart(2, "0");
const element = (tag, cls, value) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (value !== undefined) el.textContent = value;
  return el;
};
function showPosition(value) {
  $("clock").textContent = timeLabel(value);
  $("seek").value = value;
}
function reflectPlayback() {
  const playing = wantsPlayback && !audio.paused;
  $("play").textContent = playing ? "Ⅱ" : "▶";
  $("play").setAttribute("aria-label",playing ? "Pause" : "Play");
  $("tracks").querySelectorAll(".card").forEach((card,i) => {
    card.setAttribute("aria-pressed", String(i === state.track));
    card.querySelector(".cue").textContent = playing && i === state.track ? "Ⅱ" : "▶";
  });
}
function playAudio() {
  const version = sourceVersion;
  wantsPlayback = true;
  audio.play().catch(err => {
    if (version !== sourceVersion || err.name === "AbortError") return;
    wantsPlayback = false;
    $("error").textContent = "Playback could not start. Press play to retry.";
    reflectPlayback();
  });
}
function switchTrack(index, startPosition, play) {
  sourceVersion++;
  audio.pause();
  wantsPlayback = play;
  state.track = index;
  position = Math.max(0,Math.min(9.99, startPosition));
  const track = sample().tracks[index];
  $("trackname").textContent = track.name;
  $("error").textContent = "";
  $("play").disabled = false;
  audio.src = track.audio;
  audio.currentTime = position;
  showPosition(position);
  if (play) playAudio();
  reflectPlayback();
}
function toggle() {
  if (wantsPlayback) {wantsPlayback = false; audio.pause();}
  else {if (audio.ended) audio.currentTime = 0; playAudio();}
  reflectPlayback();
}
function selectSample(index) {
  state.sample = index;
  $("sample").value = String(index);
  $("prev").disabled = index === 0;
  $("next").disabled = index === group().samples.length - 1;
  const item = sample();
  $("references").replaceChildren();
  $("outputs").replaceChildren();
  item.tracks.forEach((track,i) => {
    const card = element("button","card");
    const head = element("span","cardhead");
    const cue = element("span","cue","▶");
    cue.setAttribute("aria-hidden","true");
    head.append(element("span","title",track.name),cue);
    const picture = element("img");
    picture.src = track.image;
    picture.width = 520; picture.height = 195;
    picture.alt = track.name + " spectrogram, 0 to 10 seconds, 0 to 8 kHz" +
      (track.pesq == null ? "." : ". PESQ " + track.pesq.toFixed(3) + ", SI-SNR " + track.si_snr.toFixed(2) + " dB.");
    card.append(head,picture);
    card.addEventListener("click",() => {
      if(i === state.track) {toggle(); return;}
      const at = audio.ended ? 0 : audio.currentTime || Number($("seek").value);
      switchTrack(i,at,true);
    });
    const reference = track.name === "Clean" || track.name === "Noisy";
    $(reference ? "references" : "outputs").append(card);
  });
  const defaultTrack = state.group === "scaling" ? item.tracks.length - 1 :
    item.tracks.findIndex(t => t.name === "BSTRM");
  switchTrack(defaultTrack,0,false);
}
function selectGroup(key) {
  state.group = key;
  Array.from($("groups").children).forEach(b => b.setAttribute("aria-pressed",String(b.dataset.group === key)));
  $("sample").replaceChildren(...group().samples.map((_,i) => new Option((i+1)+" of "+group().samples.length,String(i))));
  selectSample(0);
}
groupKeys.forEach(key => {
  const b = element("button","",groups[key].name);
  b.dataset.group = key;
  b.onclick = () => selectGroup(key);
  $("groups").append(b);
});
$("sample").onchange = e => selectSample(Number(e.target.value));
$("prev").onclick = () => selectSample(state.sample-1);
$("next").onclick = () => selectSample(state.sample+1);
$("play").onclick = toggle;
$("loop").onchange = e => {audio.loop = e.target.checked;};
$("seek").oninput = e => {audio.currentTime = Number(e.target.value);showPosition(audio.currentTime);};
audio.ontimeupdate = () => showPosition(audio.currentTime);
audio.onplaying = reflectPlayback;
audio.onpause = reflectPlayback;
audio.onended = () => {wantsPlayback = false; reflectPlayback();};
audio.onerror = () => {wantsPlayback = false; $("error").textContent="Audio unavailable. Keep the media folder next to this page."; reflectPlayback();};
selectGroup(groupKeys[0]);
