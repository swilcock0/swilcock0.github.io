---
layout: post
title: Creating a Reachability Map
description: >
  Experimenting with producing graphs of reachability mappings
categories: []
tags: Manipulator
sitemap: true
date: 2021-05-09 01:00:00
#img: assets/img/Posts/2020-12-03-GH-Ros.jpg
#header-img: assets/img/Posts/2020-12-03-GH-Ros.jpg
comments: false
---
Following the procedure of (Zacharias et. al, 2007: [Capturing robot workspace structure: representing robot capabilities](https://doi.org/10.1109/IROS.2007.4399105)), I have been studying the use of reachability mappings of manipulator workspaces. Using inverse kinematic (IK) solvers for a kinematic chain specific to an available manipulator setup, a number of orientations about positions on a discretised grid can be tested to be reachable. A scoring is then assigned to each position by the percentage of orientations that are achievable at that voxel location. 

{:refdef: style="text-align: center;"}
![Reach map](/assets/img/Posts/2021-05-09-Reach.png){:height="500" width="500"}
{:refdef}
A cross-section of the reach map for a manipulator.
{:.figcaption style="text-align: center;"}

This representation gives a method of capturing the workspace structure for further analysis. Whilst the initial analysis in this case took ~1 hour, the data is then easily exported to a file for quick lookup using Python or similar. This can then be utilised to score regions of the workspace for potential pick and place operations.

See below for an interactive version of the diagram!

{% include Reach.html %}





