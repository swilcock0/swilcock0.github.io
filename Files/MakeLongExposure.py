# import the necessary packages
import argparse
import imutils
import cv2
import numpy as np
import skvideo.io
import time
import os
from colorsys import hls_to_rgb
import signal,sys,time                          
terminate = False                            

def signal_handling(signum,frame):           
    global terminate                         
    terminate = True    
signal.signal(signal.SIGINT,signal_handling) 

# construct the argument parse and parse the arguments
ap = argparse.ArgumentParser()
ap.add_argument("-v", "--video", required=True,
	help="path to input video file")
ap.add_argument("-o", "--output", required=True,
	help="path to output 'long exposure', __with no file extension__")
ap.add_argument("-e", "--erosion", required=False,
	help="erosion factor")
ap.add_argument("-c", "--colour", required=False,
	help="use colour?", action=argparse.BooleanOptionalAction)
args = vars(ap.parse_args())

if args["erosion"] == None:
    args["erosion"] = 42
    
if not args["colour"] == None:
    use_colour = True
else:
    use_colour = False

# initialize the Red, Green, and Blue channel averages, along with
# the total number of frames read from the file
(rAvg, gAvg, bAvg) = (None, None, None)
total = 0
# open a pointer to the video file
print("[INFO] opening video file pointer...")
stream = cv2.VideoCapture(args["video"])
print("[INFO] computing frame averages (this will take awhile)...")
print("[WARN] ensure you've checked the polygon mapping region!")

vid_length = int(stream.get(cv2.CAP_PROP_FRAME_COUNT))

num_frames = vid_length

file_name_stub = args["output"]

last_name = file_name_stub + "_final.png"

## Next, video? Will have to rebuild the total mask each time...

height = int(stream.get(cv2.CAP_PROP_FRAME_HEIGHT))
width = int(stream.get(cv2.CAP_PROP_FRAME_WIDTH))
fps = int(stream.get(cv2.CAP_PROP_FPS))
video_frames = []

fourcc = cv2.VideoWriter_fourcc("m", "p", "4", "v")
writer = cv2.VideoWriter(file_name_stub + ".mp4", fourcc, fps*2/3,
			(width, height), True)



overlay_name = file_name_stub + "_overlay.png"

start = time.time()


rainbow_colour_scale = [ list(hls_to_rgb(2/3 * i/(vid_length-1), 0.5, 1)) for i in range(vid_length) ]
rainbow_colour_scale = (np.array(rainbow_colour_scale)*255).astype("uint8") 
rainbow_colour_scale = np.fliplr(rainbow_colour_scale) # Convert to BGR

# loop over frames from the video file stream
while True:
	# grab the frame from the file stream
	(grabbed, frame) = stream.read()

	
	clean_frame = frame
	if total < 0:
		total += 1
		continue

	# if the frame was not grabbed, then we have reached the end of
	# the sfile	

	if not grabbed:
		break
			
	# Gaussian blur and get intensity mask
	img_bw = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
	#blurred = img_bw
	blurred = img_bw#cv2.GaussianBlur(img_bw, (3, 3), 0)
	ret, mask = cv2.threshold(blurred, 250, 255, cv2.THRESH_TOZERO)
	
	height,width = mask.shape
	# right_mask_poly = np.array( [	[[width/2,0],	[width/2,height],	[width,height],		[width, 0]], 
	# 								[[0, 0],		[0, height/1.8],		[width/2, height/1.8],	[width/2, 0]]], 
	# 						dtype=np.int32 )

	right_mask_poly = np.array( [	[[0, 0],		[0, height/2.0],		[width, height/2.0],	[width, 0]]], 
							dtype=np.int32 )
	
	cv2.fillPoly( mask , right_mask_poly, (0,0,0) )

	
	mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
	if not int(args["erosion"]) == -1:
		# Eroding here #############
		
		kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(args["erosion"]),int(args["erosion"])))
		mask = cv2.morphologyEx(mask, cv2.MORPH_ERODE, kernel)
		# Mask 1 done
	
		# Dilate
		# kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(args["erosion"])+10,int(args["erosion"])+10))
		# mask = cv2.dilate(mask, kernel)
	
		# Reblur and erode mask further
		mask = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
		mask = cv2.GaussianBlur(mask, (17, 17), 0)
		ret, mask = cv2.threshold(blurred, 250, 255, cv2.THRESH_BINARY)
		mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
		kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(args["erosion"])-5,int(args["erosion"])-5))
		mask = cv2.morphologyEx(mask, cv2.MORPH_ERODE, kernel)
	
		kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(args["erosion"])-10,int(args["erosion"])-10))
		mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

		mask = mask/255.0
		# mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
	if use_colour:
		mask *= rainbow_colour_scale[total]
	mask = mask.astype("uint8")
	#print(mask)

	#### END ERODE

	if total == 0:
		total_mask = np.zeros(mask.shape, mask.dtype)
		avg = np.zeros(frame.shape, mask.dtype)

	total_mask = cv2.add(total_mask, mask)

		
	composited_img = frame# * (mask / 255)
	# print(composited_img)
	# split the frmae into its respective channels
	avg = cv2.addWeighted(avg,total/(total+1.0),composited_img,1/(total+1.0),0)	
	last_frame = frame.astype("float")

	# video stuff
	# mean = np.mean(total_mask)
	# bias = -50
	# shift = 170 - mean + bias
	# mask = cv2.add(total_mask, shift)
	# mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
	# mask_max = mask *= rainbow_colour_scale[total]
	mask = total_mask
	# print(mask)

	#print(mask_ind)

	mask_ind = (mask > 15).nonzero()
	composited_img = cv2.addWeighted(composited_img,1,mask,0.5,0)

	#composited_img[mask_ind] = mask[mask_ind] # = last_frame * (mask / 255)
	# alpha = 2.0 # Simple contrast control
	# beta = 0    # Simple brightness control
	# composited_img = cv2.convertScaleAbs(composited_img, alpha=alpha, beta=beta)
	#composited_img = cv2.addWeighted(composited_img,0.3,frame,0.6,0)

	frame = composited_img.astype(np.uint8)
	
	video_frames.append(frame)
	writer.write(frame)
	# print(frame)

	# video.write(composited_img)


	# increment the total number of frames read thus far
	### TESTING skip most frames
	total += 3 # i.e. at 30 fps, this advances one second
	stream.set(cv2.CAP_PROP_POS_FRAMES, total)
	last_frame = frame.astype("uint8")

	if total % 50 == 0:
		pct_done = total/num_frames * 100
		time_elapsed = time.time() - start
		time_remaining = (time_elapsed/(pct_done/100))*(1-pct_done/100)
		print("[{STUB}] : {0:.2f}% \t ({1} \t / {2} frames total). {3} / {4}".format(
				pct_done, total, num_frames, 
				time.strftime('%H:%M:%S', time.gmtime(time_elapsed)), time.strftime('%H:%M:%S', time.gmtime(time_remaining)) , STUB=file_name_stub))
		cv2.imwrite(file_name_stub + "_PROGRESS.png", composited_img)

	if total > num_frames -4:
		break
	
	if terminate:                            
		print("[WARN] finished early (keyboard interrupt), processing")           
		break

# merge the RGB averages together and write the output image to disk
# rAvg = ((total * rAvg) + (1 * R)) / (total + 1.0)
# gAvg = ((total * gAvg) + (1 * G)) / (total + 1.0)
# bAvg = ((total * bAvg) + (1 * B)) / (total + 1.0)

# avg = cv2.merge([bAvg, gAvg, rAvg]).astype("float")



# mean = np.mean(total_mask)
# bias = -50
# shift = 170 - mean + bias
# mask = cv2.add(total_mask, shift)
mask = total_mask
cv2.imwrite(file_name_stub + "_mask.png", mask)

cv2.imwrite(file_name_stub + "_last_clean.png", clean_frame)


mask_ind = (mask > 15).nonzero()


use_avg_frame = False # Use average frame, or last frame?
if not use_avg_frame:
    composited_img = cv2.addWeighted(last_frame,1,mask,0.5,0)
else:
    composited_img = cv2.addWeighted(avg,1,mask,0.5,0)
    
	


# print(mask)
alpha = 2.0 # Simple contrast control
beta = 0    # Simple brightness control
# composited_img = cv2.convertScaleAbs(composited_img, alpha=alpha, beta=beta)

cv2.imwrite(file_name_stub + ".png", composited_img)

background_img = cv2.convertScaleAbs(cv2.addWeighted(avg,1,mask,0.5,0), alpha=alpha, beta=beta)
foreground_img = cv2.convertScaleAbs(cv2.addWeighted(last_frame,1,mask,0.5,0) * (mask / 255), alpha=alpha, beta=beta)
added_image = cv2.addWeighted(background_img,0.5,foreground_img,0.5,0)

overlay_name = file_name_stub + "_overlay.png"
cv2.imwrite(overlay_name, added_image)

last_frame = last_frame.astype("uint8")

last_name = file_name_stub + "_final.png"

cv2.imwrite(last_name, last_frame)

# do a bit of cleanup on the file pointer
stream.release()
writer.release()
# print("Writing video...")
# skvideo.io.vwrite(file_name_stub + ".mp4", video_frames, 
#     inputdict=
#     {
#     	'-r': str(fps*2),
# 	},
# 	outputdict=
#  	{
# 		'-vcodec': 'libx264'
# 	}
#     )
# print("Done!")

os.remove(file_name_stub + "_PROGRESS.png")