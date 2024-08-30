const Product = require("../models/productModel");

const productCtrl = {

/**
 * create Product.
 * 
 * This function creates a new product.
 */
createProduct: async (req, res) => {
  try {
    const createProduct = new Product(req.body);
    const newProduct = await createProduct.save();
    res.status(201).json({
      msg: "product created successfully",
      newProduct,
    });
  } catch (error) {
     res.status(500).json({ msg: error.message });
    }
},

};

module.exports = productCtrl;
