const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

module.exports = function(passport, prisma) {
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) return done(null, false, { message: 'Incorrect email or password.' });
            const match = await bcrypt.compare(password, user.password);
            if (!match) return done(null, false, { message: 'Incorrect email or password.' });
            return done(null, user);
        } catch (err) {
            return done(err);
        }    
    }));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id }});
            done(null, user || null);
        } catch (err) {
            done(err);
        }
    })
}