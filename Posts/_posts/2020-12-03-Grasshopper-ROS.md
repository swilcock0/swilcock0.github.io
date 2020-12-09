---
layout: post
title: Connecting Grasshopper to ROS for transfer of generatively designed geometries
description: >
  Experimentation with sending geometries to ROS from Grasshopper
categories: []
tags: PhD Manipulator ROS Moveit CAD
#sitemap: false
date: 2020-12-03 08:00:00
img: assets/img/Posts/2020-12-03-GH-Ros.jpg
header-img: assets/img/Posts/2020-12-03-GH-Ros.jpg
related-posts:
  Posts/_posts/2020-11-17-ROS2-Moveit-Demo.md
---
{:refdef: style="text-align: center;"}
<!--![Structural assembly in ROS](/assets/img/Posts/2020-12-03-GH-Ros.webp){:height="500" width="500"}-->
<img src="/assets/img/Posts/2020-12-03-GH-Ros.jpg" srcset="/assets/img/Posts/webp/2020-12-03-GH-Ros.webp-small.webp 400w, /assets/img/Posts/webp/2020-12-03-GH-Ros.webp 1200w" sizes="(min-width: 960px) 400px, 100vw" alt="Structural assembly in ROS">
{:refdef}
Defining geometries in CAD and sending via ROS2 middleware. 
{:.figcaption style="text-align: center;"}


Having previously managed to get a manipulator arm [simulated in RVIZ](/posts/2020-11-17-ROS2-Moveit-Demo), using Moveit for motion planning, the next step was to integrate the simulation with computer aided design software. One goal for this project is to generatively design the structure that the manipulators will build, and with this in mind [Grasshopper](https://www.grasshopper3d.com/) is an ideal candidate. It's a geometry generation tool tightly integrated into the Rhino CAD software, allowing for graphical programming of procedural shapes, with a big focus on parametric and generative design.

{:refdef: style="text-align: center;"}
![Grasshopper Demo](/assets/img/Posts/2020-12-03-GH-Demo.gif)
{:refdef}
Rapid geometry generation in Grasshopper
{:.figcaption style="text-align: center;"}

Following the example set by [COMPAS FAB](https://gramaziokohler.github.io/compas_fab/latest/), it isn't too difficult to connect Grasshopper to ROS via the [roslibpy](https://roslibpy.readthedocs.io/en/latest/index.html) Python library, which transmits messages via the WebSocket protocol to the rosbridge web bridge. This would all be fine as is, except for the fact that the roslibpy library interacts with old school ROS whilst my project is in ROS2. Hence, it was required to pair messages between the versions by building them into the [ros1_bridge](https://github.com/ros2/ros1_bridge) (although it may be possible to remove this requirement through the use of the [new ros2 web bridge](https://github.com/RobotWebTools/ros2-web-bridge) since this also utilises a JSON WebSocket).

Having established a working connection between Grasshopper and the robot middleware, it was then necessary to create some geometry to test it with. Since we have a stack of bricks in the labs, and following the example of Gramazio Kohler's ["Informed Wall"](http://papers.cumincad.org/cgi-bin/works/Show?acadia06_489), a class B brick geometry was created. A pick and place pipeline was created in the ROS motion server; the grasp procedure approaches and retracts from the bricks at a set height above the brick in a matched orientation as will be required once there is a gripper attached to the end effector. I currently have no idea, however, about the design of the gripper that we will have available in the lab, so the system currently "floats" the bricks around 10cm from the gripper.

~~~ python
# Transmitting geometry data to ROS for motion planning
if call: 
    points = rs.coerce3dpointlist(points)
    
    poses = []
    
    for cnt, point in enumerate(points):
        point = rs.coerce3dpoint(point)
        position = dict(x = point.X/scale_factor, y = point.Y/scale_factor, z = point.Z/scale_factor)
        orientation = dict(x = QX[cnt], y = QY[cnt], z = QZ[cnt], w = QW[cnt])
        pose=dict(position= position, orientation= orientation)
        poses.append(pose)
    
    request = dict(poses=poses, orientation_constraint=1)
    sc.sticky[key_request] = request

    topic = roslibpy.Topic(client, "/vs068/ros1/move_to_poses", "my_denso_msgs/MoveToPointsM")
        
    topic.publish(roslibpy.Message(request))
~~~
Sending geometry data using ghPython
{:.figcaption style="text-align: center;"}

In order to establish a structure to build out of bricks, a sinusoidal line was created and divided into brick length spacings. The rotation of the bricks was determined by the orientation of the tangent of the line at each point, and then the rotation angles converted into quaternion angles for the benefit of the middleware. It was vital to ensure that the order of bricks in the data tree was in bottom-up order, otherwise the motion planning software would place bricks in mid-air. Otherwise there was no real consideration of the assembly order, and although the bricks are seen as collision objects for the purpose of motion planning, there is no analysis of the forces on the bricks - hence the bricks at the end of the wall cantilever out unrealistically during assembly. This will need to be accounted for in later stages, possibly through use of equilibrium equations or a dynamics engine.

With the wall generation definition complete, it was necessary to find a set of walls that could be feasibly built by the manipulator - namely, those that would fit into the effective workspace of the robot. By altering the parameters of the wall, such as the cosine period, amplitude, and location, they could be used as the genotypes for a genetic algorithm (implemented with [Wallacei X](https://www.wallacei.com/)). The fitness values for a particular structure were defined as number of bricks and percentage of bricks within the workspace, with the GA set to maximise both objectives. Designs with less than 100% of bricks within the workspace were discarded and a suitable demonstration wall selected (click button below to visualise the selected design).

<center>
<figure class="video_container">
<iframe width="560" height="315" data-src="/assets/documents/WallAndDenso.html" frameborder="0">
</iframe>
</figure>
</center>
{:.lead .outerIFrame .centered}

Here's a video of the system in action.

<figure class="video_container"><iframe width="560" height="315" src="https://www.youtube.com/embed/MLa0AMedjpQ" frameborder="0" allowfullscreen="true"></iframe></figure>
{:.lead}
Moveit2 VS068 Demonstration
{:.figcaption style="text-align: center;"}

## What next? 
Next steps will include looking at using an alternative motion planner, with possible candidates being [Descartes](http://wiki.ros.org/descartes) and [Tesseract](https://github.com/ros-industrial-consortium/tesseract_ros2) - Tesseract being more likely. The Moveit planner currently struggles with Cartesian path planning, falling back to freespace planning in many cases which will be unaccaptable in a real situation. Tesseract additionally has a good implementation for constrained path planning such that the orientation of the end effector can be specified within tolerances, which is not working currently in Moveit2. This will allow me to keep the brick one way up, preventing the arm from throwing bricks over itself and additionally keep bricks from being above the manipulator at any point.

Additionally, I'd like to implement a small, fast dynamics solver for the purposes of testing structural stability during the assembly process, and I might fall back on [pyBullet](https://pybullet.org/wordpress/) for this as I already have experience with it from my MSc project.



