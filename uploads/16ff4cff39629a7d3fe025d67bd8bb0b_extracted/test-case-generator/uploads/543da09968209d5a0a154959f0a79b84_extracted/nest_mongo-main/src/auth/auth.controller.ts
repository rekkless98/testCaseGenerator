import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LogInDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
    constructor (private authService: AuthService){}

    @Post('/signup')
    signUp(@Body() SignUpDto:SignUpDto): Promise<{token:string}>{
        return this.authService.signUp(SignUpDto)
    }

    @Get('/login')
    logIn(@Body() LogInDto:LogInDto): Promise<{token:string}>{
        return this.authService.logIn(LogInDto)
    }
}
