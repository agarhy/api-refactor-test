module.exports = {

    create: async (req, res) => {
        let token;


        let userExistant;
        let newUser = req.body;
        newUser.email = newUser.email.toLowerCase();
        newUser.username = newUser.username.toLowerCase();

        try {

            let user = await sails.models.user.em
                .findOne({
                    where: {
                        email: newUser.email,
                    },
                })

            if (user) {
                if (req.body.fromBo === true) {
                    return res.status(400).json({
                        errors: ['user_already_exists'],
                        message: 'user_already_exists',
                    });
                }
                userExistant = user;
                newUser.roles = JSON.stringify(['USER']);
                newUser.isActive = true;

                if (newUser.activationToken) {
                    delete newUser.activationToken;
                }

                if (!userExistant.country) {
                    newUser.country = 'France';
                }
                await sails.models.user.em.unifiedUpdate({
                    _id: userExistant._id,
                },
                    newUser);

            }
            if (!newUser.roles) {
                newUser.roles = JSON.stringify(['USER']);
            }

            //validate password encoding
            const passwordEncodingValidation = await AuthService.beforeCreate(newUser);

            if (!passwordEncodingValidation) {
                throw new Error('password_encoding_error');
            }

            //Create New user DB record
            let newUserRecordResult = await sails.models.user.em.create(newUser, {
                raw: true,
            });


            if (newUserRecordResult && newUserRecordResult.dataValues) {
                newUser = result.dataValues;
                if (newUser.roles && typeof newUser.roles === 'string') {
                    try {
                        newUser.roles = JSON.parse(newUser.roles);
                    } catch (e) {
                        sails.tracer.warn(e);
                    }
                }
                token = jwToken.generateFor(newUser)
                if (newUser.activationToken) {
                    delete newUser.activationToken;
                }
                newUser = await sails.models.user.em.update(newUser, {
                    where: {
                        _id: newUser._id,
                    },
                });
            } else {
                return res.status(400).json({
                    errors: ['user_not_created'],
                    message: 'user_not_created',
                });
            }



            //MangoPay
            module.exports.genereateMangoPayInfo()


            if (newUser && newUser._id && sails.config.enyo.user.emailConfirmationRequired) {
                await MailService.sendEmailConfirmation(newUser);
            }

            if (newUser._id) {
                await MailService.sendUserCreated(newUser.email, {
                    user: newUser,
                });
                return res.status(200).json({
                    user: await ResponseTransformer.user(newUser),
                    token,
                });
            } else {
                return res.status(503).json({
                    errors: ['user_not_saved'],
                    message: 'user_not_saved',
                });
            }

        } catch (err) {
            sails.tracer.warn(err && err.message ? err.message : err);
            Tools.errorCallback(err, res);

            // return res.status(503).json({
            //     errors: ['user_not_saved'],
            //     message: err,
            // });
            return false
        }


    },
    genereateMangoPayInfo: async (newUser) => {

        try {
            let mangoPayUserId = sails.config.environment === 'test' ? 111111 : await PaymentService.getMangoPayUserId(newUser)

            newUser.mangoPayUserId = mangoPayUserId;
            await sails.models.user.em.update({
                mangoPayUserId,
            }, {
                where: {
                    _id: newUser._id,
                },
            });

            let result = await sails.models.cagnotte.em.create({
                amount: 0,
                userId: newUser._id
            }, {
                raw: true,
            })

            if (result && result.dataValues) {
                newUser.cagnotteId = result.dataValues._id;
                return sails.models.user.em.update({
                    cagnotteId: result.dataValues._id,
                }, {
                    where: {
                        _id: newUser._id,
                    },
                });
            } else {
                throw new Error('error_cagnotte_creation');
            }
        } catch (err) {
            throw new Error(err);
        }
    }
}