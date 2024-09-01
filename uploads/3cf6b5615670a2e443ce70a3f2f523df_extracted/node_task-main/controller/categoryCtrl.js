const Category = require("../models/categoryModel")


const categotyCtrl = {
//  create category
createCategory: async (req, res) => {
  try {
    const createCategoty = new Category(req.body);
    const newCategoty = await createCategoty.save();
    res.status(201).json({
      msg: "category created successfully",
      newCategoty,
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
},

};

module.exports = categotyCtrl;
