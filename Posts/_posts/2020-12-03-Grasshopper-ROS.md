---
layout: post
title: Connecting Grasshopper to ROS for transfer of generatively designed geometries
description: >
  Experimentation with sending geometries to ROS from Grasshopper
tags: PhD Manipulator posts
sitemap: false
date: 2020-12-03 08:00:00
img: assets/img/Posts/2020-12-03-GH-Ros.jpg
header-img: assets/img/Posts/2020-12-03-GH-Ros.jpg
---

Having previously managed to get a manipulator arm [simulated in RVIZ](/posts/2020-11-17-ROS2-Moveit-Demo), using Moveit for motion planning, the next step was to integrate the simulation with computer aided design software. My end goal for this project is to generatively design the structure that the manipulators will build, and with this in mind [Rhino/Grasshopper](https://www.grasshopper3d.com/) is an ideal candidate. It's a geometry generation tool tightly integrated into the Rhino CAD software, allowing for graphical programming of procedural shapes, with a big focus on parametric and generative design.

{:refdef: style="text-align: center;"}
![Grasshopper Demo](/assets/img/Posts/2020-12-03-GH-Demo.gif)
{:refdef}
Rapid geometry generation in Grasshopper
{:.figcaption style="text-align: center;"}

{:refdef: style="text-align: center;"}
![Structural assembly in ROS](/assets/img/Posts/2020-12-03-GH-Ros.jpg){:height="500" width="500"}
{:refdef}
Defining geometries in CAD and sending via ROS2 middleware.
{:.figcaption style="text-align: center;"}

<center>
<figure class="video_container">
<iframe width="560" height="315" data-src="/assets/documents/WallAndDenso.html" frameborder="0">
</iframe>
</figure>
</center>
{:.lead .outerIFrame .centered}

WIP!

<figure class="video_container"><iframe width="560" height="315" src="https://www.youtube.com/embed/MLa0AMedjpQ" frameborder="0" allowfullscreen="true"></iframe></figure>
{:.lead}

Moveit2 VS068 Demonstration
{:.figcaption style="text-align: center;"}



