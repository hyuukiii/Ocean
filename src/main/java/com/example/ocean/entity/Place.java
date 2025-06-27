package com.example.ocean.entity;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@NoArgsConstructor
@AllArgsConstructor
@Data
public class Place {
<<<<<<< HEAD
    private int place_cd;
=======
    private int placeCd;
>>>>>>> 3486243e39938697a9bb8284c1e950dd43a9d266
    private String place_name;
    private String place_id;
    private String address_name;
    private double lat;
    private double lng;
    private LocalDateTime created_at;
    private String created_by;
<<<<<<< HEAD
=======

>>>>>>> 3486243e39938697a9bb8284c1e950dd43a9d266

}
