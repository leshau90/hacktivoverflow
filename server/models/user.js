const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Schema = require('mongoose').Schema
// const {CartItem,cartItemSchema} = require('./cartItem')

let userSchema = new Schema({
    name: { type: String, required: true },
    email: {
        type: String, match: [/\w+@\w+\.\w+/, 'please supply a valid email format'],
        required: true,
        validate: [{
            validator: async function (val) {
                let already = await User.findOne({ _id: { $ne: this._id }, email: val })
                return already == null
            }, msg: 'email already in use'
        }]
    },
    password: { type: String, select: false, required: true },
    image: {type:String, default:'http://icons.iconarchive.com/icons/ariil/alphabet/256/Letter-H-icon.png' },
    watched : [ { type: Schema.Types.ObjectId, ref: 'Tag' }]  
})
//synchronous
userSchema.pre('save', function () {
    if (this.isModified('password')) { this.password = bcrypt.hashSync(this.password, 6) }
})
userSchema.methods.comparePassword = function (str) {
    return bcrypt.compareSync(str, this.password)
}

let User = mongoose.model('User', userSchema)
module.exports = User

