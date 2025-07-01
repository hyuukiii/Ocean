package com.example.ocean.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LnbController {


    @GetMapping("/wsmain")
    public String WsMain(){

        return "/workspace/wsmain";
    }


}
