tensorflowjs_converter \
--input_format=tf_saved_model \
--output_node_names='20' \
--saved_model_tags=serve \
DA2_FMNIST/output/mnist.pb \
DA2_FMNIST/output/web_model