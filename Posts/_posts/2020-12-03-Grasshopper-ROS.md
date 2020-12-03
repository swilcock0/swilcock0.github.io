---
layout: post
title: Connecting Grasshopper to ROS for transfer of generatively designed geometries
description: >
  Experimentation with sending geometries to ROS from Grasshopper
tags: PhD Manipulator posts
sitemap: false
date: 2020-12-03 08:00:00
img: assets/img/Posts/2020-12-03-GH-Ros.png
---
{:refdef: style="text-align: center;"}
![My image](/assets/img/Posts/2020-12-03-GH-Ros.png){:height="500" width="500"}
{:refdef}
Defining geometries in CAD and sending via ROS2 middleware.
{:.figcaption style="text-align: center;"}

<center><button class="myButton" id="loadButton">Load visual</button></center>

<script>
document.getElementById("loadButton").onclick = function() {
  document.getElementById("loadButton").remove();

  frame = document.createElement("iframe");
  frame.src = "/assets/documents/WallAndDenso.html";
  frame.height = "315";
  frame.width = "315";
  frame.frameborder = "0";
  frame.allowfullscreen = "true";
  frame.id = "viz";

  outer = document.getElementById("vidcnt");
  outer.appendChild(frame);
}
</script>

<figure class="video_container" id="vidcnt"></figure>
{:.lead}

WIP!

<figure class="video_container"><iframe width="560" height="315" src="https://www.youtube.com/embed/MLa0AMedjpQ" frameborder="0" allowfullscreen="true"></iframe></figure>
{:.lead}
Moveit2 VS068 Demonstration
{:.figcaption style="text-align: center;"}



