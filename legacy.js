function create(req, res) {
    let token;

    //validate inputs
    if (!req.body.email) {
        return res.status(400).json({
            errors: ['error_missing_email'],
            message: 'error_missing_email',
        });
    }
    if (!req.body.password) {
        return res.status(400).json({
            errors: ['error_missing_password'],
            message: 'error_missing_password',
        });
    }
    if (!req.body.username) {
        if (sails.config.enyo.user.username) {
            return res.status(400).json({
                errors: ['error_missing_username'],
                message: 'error_missing_username',
            });
        }
        req.body.username = req.body.email;
    }

    
    let userExistant;
    let newUser = req.body;
    newUser.email = newUser.email.toLowerCase();
    newUser.username = newUser.username.toLowerCase();
    sails.models.user.em
        .findOne({
            where: {
                email: newUser.email,
            },
        })
        .then((user) => {
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
                sails.models.user.em.unifiedUpdate({
                    _id: userExistant._id,
                },
                    newUser);
                sails.models.user.em
                    .findOne({
                        where: {
                            email: userExistant.email,
                        },
                    }).then((user) => {
                        token = jwToken.generateFor(user);
                        res.status(200).json({
                            user: ResponseTransformer.user(user),
                            token,
                            update: true
                        });
                    });
            }
            if (!newUser.roles) {
                newUser.roles = JSON.stringify(['USER']);
            }
            return AuthService.beforeCreate(newUser);
        })
        .then((data) => {
            if (data) {
                return sails.models.user.em.create(newUser, {
                    raw: true,
                });
            }
            throw new Error('password_encoding_error');
        })
        .then((result) => {
            if (result && result.dataValues) {
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
                return sails.models.user.em.update(newUser, {
                    where: {
                        _id: newUser._id,
                    },
                });
            }
            return res.status(400).json({
                errors: ['user_not_created'],
                message: 'user_not_created',
            });
        })
        .then(() => {
            if (newUser && newUser._id && sails.config.enyo.user.emailConfirmationRequired) {
                return MailService.sendEmailConfirmation(newUser);
            }
            return true;
        })
        .then(() => (sails.config.environment === 'test' ? 111111 : PaymentService.getMangoPayUserId(newUser)))
        .then((mangoPayUserId) => {
            newUser.mangoPayUserId = mangoPayUserId;
            return sails.models.user.em.update({
                mangoPayUserId,
            }, {
                where: {
                    _id: newUser._id,
                },
            });
        })
        .then(() => sails.models.cagnotte.em.create({
            amount: 0,
            userId: newUser._id
        }, {
            raw: true,
        }))
        .then((result) => {
            if (result && result.dataValues) {
                newUser.cagnotteId = result.dataValues._id;
                return sails.models.user.em.update({
                    cagnotteId: result.dataValues._id,
                }, {
                    where: {
                        _id: newUser._id,
                    },
                });
            }
            throw new Error('error_cagnotte_creation');
        })
        .then(() => {
            if (newUser._id) {
                MailService.sendUserCreated(newUser.email, {
                    user: newUser,
                });
                res.status(200).json({
                    user: ResponseTransformer.user(newUser),
                    token,
                });
            } else {
                res.status(503).json({
                    errors: ['user_not_saved'],
                    message: 'user_not_saved',
                });
            }
        })
        .catch((err) => {
            sails.tracer.warn(err && err.message ? err.message : err);
            Tools.errorCallback(err, res);
        });
}