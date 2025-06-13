// Initialize AOS animation library
document.addEventListener('DOMContentLoaded', function() {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        mirror: false
    });

    // Mobile navigation toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when clicking on a nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Active nav links on scroll
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links a');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });

    // Testimonial slider
    const testimonials = document.querySelectorAll('.testimonial');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    
    let currentIndex = 0;
    
    // Hide all testimonials except the first one
    testimonials.forEach((testimonial, index) => {
        if (index !== 0) {
            testimonial.style.display = 'none';
        }
    });
    
    // Show testimonial by index
    function showTestimonial(index) {
        testimonials.forEach(testimonial => {
            testimonial.style.display = 'none';
        });
        
        dots.forEach(dot => {
            dot.classList.remove('active');
        });
        
        testimonials[index].style.display = 'block';
        dots[index].classList.add('active');
        
        // Add fade-in animation
        testimonials[index].classList.add('fade-in');
        setTimeout(() => {
            testimonials[index].classList.remove('fade-in');
        }, 500);
    }
    
    // Next button
    nextBtn.addEventListener('click', () => {
        currentIndex++;
        if (currentIndex >= testimonials.length) {
            currentIndex = 0;
        }
        showTestimonial(currentIndex);
    });
    
    // Previous button
    prevBtn.addEventListener('click', () => {
        currentIndex--;
        if (currentIndex < 0) {
            currentIndex = testimonials.length - 1;
        }
        showTestimonial(currentIndex);
    });
    
    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentIndex = index;
            showTestimonial(currentIndex);
        });
    });

    // Auto-play testimonials
    setInterval(() => {
        currentIndex++;
        if (currentIndex >= testimonials.length) {
            currentIndex = 0;
        }
        showTestimonial(currentIndex);
    }, 5000);

    // Form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const company = document.getElementById('company').value;
            const message = document.getElementById('message').value;
            
            // Simple form validation
            if (!name || !email || !message) {
                alert('Vui lòng điền đầy đủ thông tin bắt buộc.');
                return;
            }
            
            // Here you would typically send the form data to a server
            // For demonstration, we'll just show a success message
            
            // Reset form fields
            contactForm.reset();
            
            // Show success message
            alert('Cảm ơn bạn đã gửi tin nhắn! Chúng tôi sẽ liên hệ lại với bạn sớm.');
        });
    }

    // Floating animation for icons
    const floatingIcons = document.querySelectorAll('.floating-icon');
    
    floatingIcons.forEach(icon => {
        // Random starting position
        const randomX = Math.random() * 20 - 10;
        const randomY = Math.random() * 20 - 10;
        
        // Apply random transform
        icon.style.transform = `translate(${randomX}px, ${randomY}px)`;
    });

    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.querySelectorAll('.feature-icon i').forEach(icon => {
                icon.style.transform = 'scale(1.2)';
                icon.style.transition = 'transform 0.3s ease';
            });
        });
        
        card.addEventListener('mouseleave', () => {
            card.querySelectorAll('.feature-icon i').forEach(icon => {
                icon.style.transform = 'scale(1)';
            });
        });
    });

    // Add hover effects to tool cards
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.querySelectorAll('.tool-icon i').forEach(icon => {
                icon.style.transform = 'scale(1.2)';
                icon.style.transition = 'transform 0.3s ease';
            });
        });
        
        card.addEventListener('mouseleave', () => {
            card.querySelectorAll('.tool-icon i').forEach(icon => {
                icon.style.transform = 'scale(1)';
            });
        });
    });

    // Add animation to graph dots on scroll
    const graphDots = document.querySelectorAll('.graph-dot');
    const graphSection = document.querySelector('.benefits');
    
    if (graphSection && graphDots.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    graphDots.forEach((dot, index) => {
                        setTimeout(() => {
                            const height = dot.getAttribute('data-percentage') + 'px';
                            dot.querySelector('::before').style.height = height;
                        }, index * 200);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(graphSection);
    }

    // Add parallax effect to hero section
    const heroSection = document.querySelector('.hero');
    
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY;
            if (scrollPosition < 600) {
                heroSection.style.backgroundPosition = `50% ${scrollPosition * 0.05}px`;
            }
        });
    }

    // Logo animation on hover
    const logo = document.getElementById('logo');
    
    if (logo) {
        logo.addEventListener('mouseenter', () => {
            logo.style.animation = 'none';
            setTimeout(() => {
                logo.style.animation = 'pulse 1s 2';
            }, 10);
        });
    }

    // Tool card link effect
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const parent = btn.closest('.tool-card');
            parent.style.borderColor = 'var(--primary-color)';
        });
        
        btn.addEventListener('mouseleave', () => {
            const parent = btn.closest('.tool-card');
            parent.style.borderColor = 'transparent';
        });
    });

    // Preload images for better performance
    function preloadImages() {
        const imageSources = [
            'images/logo.png',
            'images/server-room.jpg',
            'images/benefits.jpg',
            'images/client1.jpg',
            'images/client2.jpg',
            'images/client3.jpg',
            'images/pattern.png',
            'images/quote-pattern.png'
        ];
        
        imageSources.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }
    
    preloadImages();
}); 