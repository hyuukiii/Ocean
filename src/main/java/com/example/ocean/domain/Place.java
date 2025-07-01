package com.example.ocean.domain;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@NoArgsConstructor
@AllArgsConstructor
@Data
public class Place {
    private int place_cd;
    private String place_name;
    private String place_id;
    private String address_name;
    private double lat;
    private double lng;
    private LocalDateTime created_at;
    private String created_by;

}
