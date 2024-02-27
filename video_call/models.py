from django.db import models
from django.contrib.auth.models import AbstractUser



class Account(AbstractUser):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    bio = models.CharField(max_length=50)
    gender =  models.CharField(max_length=1, choices=GENDER_CHOICES)
    profile_picture = models.ImageField(upload_to='profile_picture')
    dob = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'Account'
