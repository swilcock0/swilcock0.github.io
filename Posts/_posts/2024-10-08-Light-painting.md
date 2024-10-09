---
layout: post
title: Light painting
description: >
  Light painting with a Fanuc CR10ia/L and Python
categories: []
tags: Python robotics
sitemap: true
date: 2024-10-08 01:00:00
# redirect_from:
#   - /BeCurious
img: assets/img/Posts/2024-10-08-Light-painting-1.png
header-img: assets/img/Posts/2024-10-08-Light-painting-1.png
comments: true
---
{:refdef: style="text-align: center;"}
![Light painting front](/assets/img/Posts/2024-10-08-Light-painting-1.png){:height="1000" width="500"}
{:refdef}
For a recent conference, I wanted to quickly demonstrate some robot control from CAD to robot although we've not yet integrated an end-effector. So we came upon the idea of light painting!

{:refdef: style="text-align: center;"}
![Light painting end effector](/assets/img/Posts/2024-10-08-Light-painting-eef.jpg){:height="1000" width="500"}
{:refdef}
Here's the quick and dirty LED holder I printed to bolt onto the arm, with a bulky rectangular section that holds a 2xAA battery pack.

<figure class="video_container"><iframe width="560" height="315" src="https://www.youtube.com/embed/pSzDl-VMxvs/" frameborder="0" allowfullscreen="true"></iframe></figure>
And here's a video of the end result!

The Python script used to generate these images and videos can be found <a href="https://samwilcock.xyz/Files/MakeLongExposure.py" target="_top_">here</a>. It's based on <a href="https://pyimagesearch.com/2017/08/14/long-exposure-with-opencv-and-python/">this article</a>.



