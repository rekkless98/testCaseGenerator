import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LogInDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name)
        private userModel:Model<User>,
        private jwtService : JwtService
    ){}

    async signUp(signUpDto:SignUpDto): Promise<{ token: string}>{
        const {name , email , password} = signUpDto

        const hasPassword = await bcrypt.hash(password,10)

        const user = await this.userModel.create({
            name,
            email,
            password:hasPassword
        })

        const token = await this.jwtService.sign({id: user._id})
        return {token}
    }

    async logIn(logInDto:LogInDto): Promise<{ token: string}>{
        const {email , password} = logInDto

        const user = await this.userModel.findOne({email})
        if(!user)  throw new UnauthorizedException('email or password wrong')
        
        const isPasswordMatched  = await bcrypt.compare(password,user.password)
        if(!isPasswordMatched)  throw new UnauthorizedException('email or password wrong')

        const token = await this.jwtService.sign({id: user._id})
        return {token}
    }
}
