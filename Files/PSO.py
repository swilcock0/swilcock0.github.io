import numpy.random as rd
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.axes_grid1 import make_axes_locatable

from celluloid import Camera
plt.style.use('seaborn-pastel')

x_range = [-10, 10]
y_range = [-10, 10]
n = 5 #Particles
global global_best, global_best_id, global_best_pos
global_best = 999999
global_best_id = -1
global_best_pos = [-999, -999]
generation = 0

w_i = 0.5 # Inertia weight
w_c = 1 # Cognitive coeff
w_s = 1 # Social coeff

fig, ax = plt.subplots()
divider = make_axes_locatable(ax)
cax = divider.append_axes('right', size='5%', pad=0.05)

camera = Camera(fig)
plt.rcParams["axes.titlesize"] = 8
ax.autoscale_view(True)
ax.set_xlim(x_range)
ax.set_ylim(y_range)

functions = {
    0 : {"fn_text" : "x**2.0 + y**2.0", 
        "fn_name" : "Sphere_fn"},
    1 : {"fn_text" : "-np.cos(x)*np.cos(y)*np.exp(-((x-np.pi)**2+(y-np.pi)**2))",
        "fn_name" : "Easom_fn"},
    2 : {"fn_text" : "-0.0001*(abs(np.sin(x)*np.sin(y)*np.exp(abs(100-(((x**2.0+y**2.0)**0.5)/np.pi))))+1)**0.1",
        "fn_name" : "Cross_in_tray_fn"}
    }
select = 2
fn_text = functions[select]["fn_text"]
fn_name = functions[select]["fn_name"]

# Define objective function
def objective(x, y):
	return eval(fn_text)


# Sample objective space for contours
cont_x = np.arange(x_range[0], x_range[1], 0.1)
cont_y = np.arange(y_range[0], y_range[1], 0.1)
[X, Y] = np.meshgrid(cont_x, cont_y)
Z = objective(X, Y)
cp = plt.contourf(X,Y,Z)

# Define particle class
class Particle:
    def __init__(self, id=-1):
        self.x = rd.uniform(low=x_range[0], high=x_range[1])
        self.y = rd.uniform(low=y_range[0], high=y_range[1])
        self.x_v = rd.uniform(low=-abs(x_range[1]-x_range[0]), high=abs(x_range[1]-x_range[0]))
        self.y_v = rd.uniform(low=-abs(y_range[1]-y_range[0]), high=abs(y_range[1]-y_range[0]))

        self.best = objective(self.x, self.y)   
        self.current = self.best
        self.best_pos = [self.x, self.y]

        self.id = id
    
    def update_pos(self):
        rd_c = rd.rand()
        rd_s = rd.rand()
        self.x_v = w_i*self.x_v + w_c*rd_c*(self.best_pos[0]-self.x) + w_s*rd_s*(global_best_pos[0]-self.x)

        self.x = self.x + self.x_v

        rd_c = rd.rand()
        rd_s = rd.rand()
        self.y_v = w_i*self.y_v + w_c*rd_c*(self.best_pos[1]-self.y) + w_s*rd_s*(global_best_pos[1]-self.y)

        self.y = self.y + self.y_v

    def update_obj(self):
        global global_best, global_best_pos, global_best_id
        self.current = objective(self.x, self.y)

        if self.current < self.best:
            self.best = self.current
            self.best_pos = [self.x, self.y]
        if self.current < global_best:
            global_best = self.current
            global_best_pos = [self.x, self.y]
            global_best_id = self.id

    def update_full(self):
        self.update_pos()
        self.update_obj()

# Define plotter 
def plot_particles():
    x = []
    y = []

    for p in particles:
        x.append(p.x)
        y.append(p.y)

    cp = ax.contourf(X, Y, Z)
    fig.colorbar(cp, cax=cax, ax = ax)
    ax.plot(x,y, 'kx')
    ax.plot(global_best_pos[0], global_best_pos[1], 'ro')
    ax.set_title("PSO for f(x,y)=\n" + fn_text)

# Initialise set of particles
particles = [Particle(id=i) for i in range(n)]
for p in particles:
    p.update_obj()

plot_particles()
camera.snap()

iteration_bests = []
for i in range(20):
    generation += 1
    for p in particles:
        p.update_full()
    plot_particles()
    camera.snap()   
    iteration_bests.append(global_best)

print("Best position found : [{x:.5f}, {y:.5f}]".format(x=global_best_pos[0], y=global_best_pos[1]))

animation = camera.animate(interval=500, blit=False)
animation.save('pso_'+fn_name +'.gif', writer = 'imagemagick')

fig = plt.figure()
plt.cla()
plt.plot(iteration_bests)
plt.show()