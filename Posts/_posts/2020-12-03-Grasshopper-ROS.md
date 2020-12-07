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
{:refdef: style="text-align: center;"}
![Structural assembly in ROS](/assets/img/Posts/2020-12-03-GH-Ros.jpg){:height="500" width="500"}
{:refdef}
Defining geometries in CAD and sending via ROS2 middleware.
{:.figcaption style="text-align: center;"}


Having previously managed to get a manipulator arm [simulated in RVIZ](/posts/2020-11-17-ROS2-Moveit-Demo), using Moveit for motion planning, the next step was to integrate the simulation with computer aided design software. My end goal for this project is to generatively design the structure that the manipulators will build, and with this in mind [Rhino/Grasshopper](https://www.grasshopper3d.com/) is an ideal candidate. It's a geometry generation tool tightly integrated into the Rhino CAD software, allowing for graphical programming of procedural shapes, with a big focus on parametric and generative design.

{:refdef: style="text-align: center;"}
![Grasshopper Demo](/assets/img/Posts/2020-12-03-GH-Demo.gif)
{:refdef}
Rapid geometry generation in Grasshopper
{:.figcaption style="text-align: center;"}

Following the example set by [COMPAS FAB](https://gramaziokohler.github.io/compas_fab/latest/), it isn't too difficult to connect Grasshopper to ROS via the [roslibpy](https://roslibpy.readthedocs.io/en/latest/index.html) Python library, which transmits messages via the WebSocket protocol to the rosbridge web bridge. This would all be fine as is, except for the fact that the roslibpy library interacts with old school ROS whilst my project is in ROS2. Hence, it was required to pair messages between the versions by building them into the [ros1_bridge](https://github.com/ros2/ros1_bridge).

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

Having established a working connection between Grasshopper and the robot middleware, it was then necessary to create some geometry to test it with. Since we have a stack of bricks in the labs, and following the example of Gramazio Kohler's ["Informed Wall"](http://papers.cumincad.org/cgi-bin/works/Show?acadia06_489), a class B brick geometry was created. A pick and place pipeline was created in the ROS motion server; the grasp procedure approaches and retracts from the bricks at a set height above the brick in a matched orientation as will be required once there is a gripper attached to the end effector. I currently have no idea, however, about the design of the gripper that we will have available in the lab, so the system currently "floats" the bricks around 10cm from the gripper.

In order to establish a structure to build out of bricks, a sinusoidal line was created and divided into brick length spacings. The rotation of the bricks was determined by the orientation of the tangent of the line at each point, and then the rotation angles converted into quaternion angles for the benefit of the middleware. It was vital to ensure that the order of bricks in the data tree was in bottom-up order, otherwise the motion planning software would place bricks in mid-air. Otherwise there was no real consideration of the assembly order, and although the bricks are seen as collision objects for the purpose of motion planning, there is no analysis of the forces on the bricks - hence the bricks at the end of the wall cantilever out unrealistically during assembly. This will need to be accounted for in later stages, possibly through use of equilibrium equations or a dynamics engine.

With the wall generation definition complete, it was necessary to find a set of walls that could be feasibly built by the manipulator - namely, those that would fit into the effective workspace of the robot. By altering the parameters of the wall, such as the cosine period, amplitude, and location, they could be used as the genotypes for a genetic algorithm (implemented with [Wallacei X](https://www.wallacei.com/)). The fitness values for a particular structure were defined as number of bricks and percentage of bricks within the workspace, with the GA set to maximise both objectives. Designs with less than 100% of bricks within the workspace were discarded and a suitable demonstration wall selected (click button below to visualise the selected design).

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



