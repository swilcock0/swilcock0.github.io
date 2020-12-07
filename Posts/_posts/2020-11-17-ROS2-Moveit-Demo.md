---
layout: post
title: ROS2 and Moveit2 Demonstration
description: >
  A first demonstration of the Moveit2 planning capabilities for a Denso VS068 manipulator
tags: PhD Manipulator Posts
sitemap: true
date: 2020-11-17 18:00:00
img: assets/img/Posts/2020-11-17-Manipulator-Hemisphere.jpg
---
{:refdef: style="text-align: center;"}
![The VS068 moving to a series of points](/assets/img/Posts/2020-11-17-Manipulator-Hemisphere.jpg){:height="500" width="500"}
{:refdef}
The VS068 moving to a series of points
{:.figcaption style="text-align: center;"}

My recent work has required me to learn ROS2. Having not used the original ROS before, I took an excellent course on Udemy by Edouard Renard - [ROS2 for Beginners (ROS Foxy - 2020)](https://www.udemy.com/course/ros2-for-beginners/) which I can highly recommend if you're just starting out or migrating over to ROS2. Edouard takes the time to explain every example in the creation of nodes, publishers, subscribers, services and messages in both Python and C++ before leading into a typical Turtlesim project, and I found that it very quickly brought me upto speed on the distributed middleware system.

Since my work is aiming to focus on bringing robotic simulation and planning for structural assemblies into the geometry design process, I have been building on the tools available to implement a model of the Denso VS068 manipulator that we have available in the lab. The trusty [Solidworks to URDF Exporter](http://wiki.ros.org/sw_urdf_exporter) worked a treat for converting the provided CAD files of the arm into a useable description format for ROS2, whilst the [Moveit! Setup Assistant](http://docs.ros.org/en/kinetic/api/moveit_tutorials/html/doc/setup_assistant/setup_assistant_tutorial.html) aided in the generation of configuration files for motion planning. The setup assistant hasn't yet been ported to Moveit2, however the generated .yaml and srdf files required little modification to get a working model.

<figure class="video_container"><iframe width="560" height="315" src="https://www.youtube.com/embed/sSEF9cADy6s" frameborder="0" allowfullscreen="true"></iframe></figure>
{:.lead}
VS068 Demonstration
{:.figcaption style="text-align: center;"}

One aspect of ROS that wasn't explained in Renard's course was action servers, and this proved to be a temporary barrier in enabling Moveit to execute trajectories. It took a little while until I realised that the action server had to be written to enable this capability (of course! How else can you then connect a software controller to the hardware?). Once this was in place, the Moveit2 demos provided a useful start for looking at how to utilise the MoveGroupInterface and PlanningScene classes in a Object-Oriented C++ server. They also made me realise how rusty my C++ was...

Moveit2 is still approaching maturity - it has currently been [95% ported](https://moveit.ros.org/documentation/contributing/roadmap/) over from Moveit! thanks to the fantastic work of [Henning Kayser and the Moveit community](https://github.com/ros-planning/moveit2). I've been unable to work with the python wrapper yet - moveit_commander doesn't seem to be a high priority for porting currently, and I don't blame them. Instead, I've been experimenting with writing a set of motion planning services with C++, which I can then easily connect to using Python. Above you can see some of the initial results of planning to position goals for the end-effector.

## Where next? 
My next steps (besides juggling these forays into new software with writing my first PhD literature review) are to leverage the [ROS1 Bridge](https://github.com/ros2/ros1_bridge) and [COMPAS FAB](https://gramaziokohler.github.io/compas_fab/latest/) in order to connect the simulation and planning server to Rhino/Grasshopper, such that I can pass parametrically designed geometries to the simulated manipulator.  




