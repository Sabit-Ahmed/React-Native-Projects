### Import the ONNX model to Tensorflow ###

import onnx
from onnx_tf.backend import prepare
import torch

# Load the ONNX file
model = onnx.load('DA2_FMNIST/output/mnist.onnx')

# Import the ONNX model to Tensorflow
tf_rep = prepare(model, strict=False)

# Input nodes to the model
print('inputs:', tf_rep.inputs)

# Output nodes from the model
print('outputs:', tf_rep.outputs)

# All nodes in the model
print('tensor_dict:')
print(tf_rep.tensor_dict)


#############
### To know the onnx output node names ###
output_node =[node.name for node in model.graph.output]

input_all = [node.name for node in model.graph.input]
input_initializer =  [node.name for node in model.graph.initializer]
net_feed_input = list(set(input_all)  - set(input_initializer))

print('Inputs: ', net_feed_input)
print('Outputs: ', output_node)

#########################
### Output mapping  ###
def output_label(label):
    output_mapping = {
                 0: "T-shirt/Top",
                 1: "Trouser",
                 2: "Pullover",
                 3: "Dress",
                 4: "Coat", 
                 5: "Sandal", 
                 6: "Shirt",
                 7: "Sneaker",
                 8: "Bag",
                 9: "Ankle Boot"
                 }
    input = (label.item() if type(label) == torch.Tensor else label)
    return output_mapping[input]


#################################
####  Run the model in Tensorflow  ####

import numpy as np
from IPython.display import display
from PIL import Image

print('Image 1:')
img = Image.open('DA2_FMNIST/assets/Bag.png').resize((28, 28)).convert('L')
display(img)
output = tf_rep.run(np.asarray(img, dtype=np.float32)[np.newaxis, np.newaxis, :, :])
print('The image is classified as ', output_label(np.argmax(output)))

print('Image 2:')
img = Image.open('DA2_FMNIST/assets/Pullover.png').resize((28, 28)).convert('L')
display(img)
output = tf_rep.run(np.asarray(img, dtype=np.float32)[np.newaxis, np.newaxis, :, :])
print('The image is classified as ', output_label(np.argmax(output)))

#################################

### Save the Tensorflow model into a file ###

tf_rep.export_graph('DA2_FMNIST/output/mnist.pb')